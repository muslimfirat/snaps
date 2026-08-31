import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  writeBatch,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  SnapSolution,
  MistakeQuestionItem,
  MockExamRecord,
  PlannedMockExam,
  WeeklyStudyPlan,
  Flashcard,
  Subject,
  ExamCategory,
  NoteProgress,
} from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CloudUserData {
  profile?: UserProfile;
  snaps?: SnapSolution[];
  mistakes?: MistakeQuestionItem[];
  mockExams?: MockExamRecord[];
  /** İleri tarihli planlanmış denemeler (ana dokümanda, küçük ve sınırlı). */
  plannedMocks?: PlannedMockExam[];
  studyPlan?: WeeklyStudyPlan | null;
  flashcards?: Flashcard[];
  subjects?: Record<string, Subject[]>;
  /** Defter Notları okuma/tekrar durumu (görseller senkronlanmaz). */
  noteProgress?: Record<string, NoteProgress>;
}

/**
 * The four large, ever-growing lists now each live in their own subcollection
 * under `/users/{uid}/{name}/{id}` instead of as arrays on the user document.
 * Everything else (profile, studyPlan, subjects_*) stays on the main document,
 * which is small and bounded.
 */
const COLLECTION_FIELDS = ['snaps', 'mistakes', 'mockExams', 'flashcards'] as const;
type CollectionField = (typeof COLLECTION_FIELDS)[number];

/** Firestore caps a batched write at 500 operations; stay well under it. */
const BATCH_LIMIT = 450;

/**
 * Firestore rejects any document larger than 1 MiB. The main user document only
 * carries profile + studyPlan + subjects now, so this is a generous margin, but
 * we keep the guard as a backstop (see {@link trimOversizedPayload}).
 */
const MAX_DOC_BYTES = 900_000;

/**
 * Base64 image data URLs (snap photos, optical forms) are the single biggest
 * contributor to document size and are only useful on the device that captured
 * them. Strip them before anything is written to the cloud; the local copy in
 * localStorage keeps the image for that device.
 */
function stripImageField<T extends { imageUrl?: string }>(item: T): T {
  if (!item || typeof item !== 'object' || item.imageUrl === undefined) return item;
  const { imageUrl, ...rest } = item;
  return rest as T;
}

/**
 * Removes the largest fields from `updates` until the serialized document fits
 * within {@link MAX_DOC_BYTES}. Returns the names of any dropped fields.
 */
function trimOversizedPayload(updates: Record<string, any>): string[] {
  const dropped: string[] = [];
  let serialized = JSON.stringify(updates);
  if (serialized.length <= MAX_DOC_BYTES) return dropped;

  const fields = Object.keys(updates)
    .filter((k) => k !== 'userId' && k !== 'updatedAt')
    .map((k) => ({ k, size: JSON.stringify(updates[k] ?? null).length }))
    .sort((a, b) => b.size - a.size);

  for (const { k, size } of fields) {
    if (serialized.length <= MAX_DOC_BYTES) break;
    console.warn(
      `Firestore payload too large (${serialized.length} B); dropping field "${k}" (${size} B) from this sync.`,
    );
    delete updates[k];
    dropped.push(k);
    serialized = JSON.stringify(updates);
  }
  return dropped;
}

function itemId(item: unknown): string | null {
  if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
    return (item as { id: string }).id;
  }
  return null;
}

function prepForCloud<T extends { id: string }>(collName: CollectionField, item: T): T {
  if (collName === 'snaps' || collName === 'mistakes') {
    return stripImageField(item as T & { imageUrl?: string });
  }
  return item;
}

/**
 * Applies an explicit delta to a subcollection: upsert every item in `upserts`
 * (merge) and delete every id in `deleteIds`. Splits into <=450-op batches.
 */
export async function syncCollectionDelta<T extends { id: string }>(
  uid: string,
  collName: CollectionField,
  upserts: T[],
  deleteIds: string[],
  database: Firestore = db,
): Promise<void> {
  type Op = { type: 'set'; item: T } | { type: 'delete'; id: string };
  const ops: Op[] = [
    ...upserts.filter((it) => itemId(it)).map((item) => ({ type: 'set', item } as Op)),
    ...deleteIds.map((id) => ({ type: 'delete', id } as Op)),
  ];

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(database);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      if (op.type === 'set') {
        batch.set(
          doc(database, 'users', uid, collName, op.item.id),
          prepForCloud(collName, op.item),
          { merge: true },
        );
      } else {
        batch.delete(doc(database, 'users', uid, collName, op.id));
      }
    }
    await batch.commit();
  }
}

/**
 * Reconciles a subcollection against the full authoritative list from the
 * client: everything in `list` is upserted, any cloud document whose id is not
 * in `list` is deleted.
 */
async function syncFullList<T extends { id: string }>(
  uid: string,
  collName: CollectionField,
  list: T[],
  database: Firestore,
): Promise<void> {
  const existing = await getDocs(collection(database, 'users', uid, collName));
  const nextIds = new Set(list.map((it) => itemId(it)).filter((id): id is string => !!id));
  const deleteIds = existing.docs.map((d) => d.id).filter((id) => !nextIds.has(id));
  await syncCollectionDelta(uid, collName, list, deleteIds, database);
}

/**
 * Saves user data to Firestore. Profile / studyPlan / subjects go on the main
 * `/users/{uid}` document; the four large lists are reconciled into their
 * subcollections. Any list field left `undefined` is not touched.
 *
 * @throws if the main document still exceeds the size limit after trimming.
 */
export async function syncUserDataToFirestore(
  userId: string,
  data: {
    profile?: UserProfile;
    snaps?: SnapSolution[];
    mistakes?: MistakeQuestionItem[];
    mockExams?: MockExamRecord[];
    plannedMocks?: PlannedMockExam[];
    studyPlan?: WeeklyStudyPlan | null;
    flashcards?: Flashcard[];
    subjects?: Subject[];
    targetExam?: ExamCategory;
    noteProgress?: Record<string, NoteProgress>;
  },
  database: Firestore = db,
): Promise<void> {
  try {
    // 1. Main document — small, bounded fields only.
    const updates: Record<string, any> = {
      userId,
      updatedAt: serverTimestamp(),
    };
    if (data.profile) updates.profile = data.profile;
    if (data.studyPlan !== undefined) updates.studyPlan = data.studyPlan;
    if (data.plannedMocks !== undefined) updates.plannedMocks = data.plannedMocks;
    if (data.subjects !== undefined && data.targetExam) {
      updates[`subjects_${data.targetExam}`] = data.subjects;
    }
    if (data.noteProgress !== undefined) updates.noteProgress = data.noteProgress;

    const dropped = trimOversizedPayload(updates);
    if (JSON.stringify(updates).length > MAX_DOC_BYTES) {
      throw new Error('CLOUD_PAYLOAD_TOO_LARGE');
    }
    if (dropped.length > 0) {
      console.warn(`Cloud sync completed without fields: ${dropped.join(', ')}`);
    }

    await setDoc(doc(database, 'users', userId), updates, { merge: true });

    // 2. Subcollections — one document per item, reconciled against the full list.
    for (const field of COLLECTION_FIELDS) {
      const list = data[field] as { id: string }[] | undefined;
      if (list !== undefined) {
        await syncFullList(userId, field, list, database);
      }
    }
  } catch (error) {
    console.error('Error syncing user data to Firestore:', error);
    throw error;
  }
}

/**
 * Loads the user's saved data on sign in: the main document plus every
 * subcollection.
 */
export async function fetchAllCollections(
  userId: string,
  database: Firestore = db,
): Promise<CloudUserData | null> {
  try {
    const mainSnap = await getDoc(doc(database, 'users', userId));
    const [snaps, mistakes, mockExams, flashcards] = await Promise.all(
      COLLECTION_FIELDS.map((f) => getDocs(collection(database, 'users', userId, f))),
    );

    const hasMain = mainSnap.exists();
    const anyCollectionDocs =
      !snaps.empty || !mistakes.empty || !mockExams.empty || !flashcards.empty;
    if (!hasMain && !anyCollectionDocs) return null;

    const data = hasMain ? mainSnap.data() : {};
    return {
      profile: data.profile || (data.name ? (data as unknown as UserProfile) : undefined),
      snaps: snaps.docs.map((d) => d.data() as SnapSolution),
      mistakes: mistakes.docs.map((d) => d.data() as MistakeQuestionItem),
      mockExams: mockExams.docs.map((d) => d.data() as MockExamRecord),
      flashcards: flashcards.docs.map((d) => d.data() as Flashcard),
      studyPlan: data.studyPlan || undefined,
      subjects: data.subjects || undefined,
      noteProgress: data.noteProgress || undefined,
      plannedMocks: Array.isArray(data.plannedMocks) ? (data.plannedMocks as PlannedMockExam[]) : undefined,
    };
  } catch (error) {
    console.error('Error fetching user data from Firestore:', error);
    throw error;
  }
}

/**
 * One-time move of the legacy embedded arrays on `/users/{uid}` into their
 * subcollections. Idempotent: a local marker plus the absence of the arrays on
 * the document both short-circuit repeat runs. On partial failure the main
 * document is left untouched so the migration can be retried.
 *
 * @returns true if a migration was performed this call.
 */
export async function migrateUserToSubcollections(
  userId: string,
  database: Firestore = db,
): Promise<boolean> {
  const markerKey = `snaps_migrated_v2_${userId}`;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(markerKey) === '1') {
      return false;
    }

    const mainSnap = await getDoc(doc(database, 'users', userId));
    if (!mainSnap.exists()) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(markerKey, '1');
      return false;
    }

    const data = mainSnap.data();
    const legacyFields = COLLECTION_FIELDS.filter((f) => Array.isArray(data[f]) && data[f].length > 0);
    const emptyLegacyFields = COLLECTION_FIELDS.filter(
      (f) => Array.isArray(data[f]) && data[f].length === 0,
    );

    if (legacyFields.length === 0 && emptyLegacyFields.length === 0) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(markerKey, '1');
      return false;
    }

    for (const field of legacyFields) {
      const arr = (data[field] as { id: string }[]).filter((it) => itemId(it));
      await syncCollectionDelta(userId, field, arr, [], database);
    }

    // Only after every subcollection write succeeded, drop the arrays.
    const clear: Record<string, any> = {};
    for (const field of [...legacyFields, ...emptyLegacyFields]) {
      clear[field] = deleteField();
    }
    await updateDoc(doc(database, 'users', userId), clear);

    if (typeof localStorage !== 'undefined') localStorage.setItem(markerKey, '1');
    return legacyFields.length > 0;
  } catch (error) {
    console.error('Error migrating user data to subcollections:', error);
    // Leave the marker unset so the next sign-in retries.
    throw error;
  }
}
