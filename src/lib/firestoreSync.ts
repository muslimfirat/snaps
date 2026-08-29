import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  SnapSolution,
  MistakeQuestionItem,
  MockExamRecord,
  WeeklyStudyPlan,
  Flashcard,
  Subject,
  ExamCategory,
} from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CloudUserData {
  profile?: UserProfile;
  snaps?: SnapSolution[];
  mistakes?: MistakeQuestionItem[];
  mockExams?: MockExamRecord[];
  studyPlan?: WeeklyStudyPlan | null;
  flashcards?: Flashcard[];
  subjects?: Record<string, Subject[]>;
}

/**
 * Firestore rejects any document larger than 1 MiB. We keep a safety margin and
 * drop the heaviest fields before that happens (see {@link trimOversizedPayload}).
 */
const MAX_DOC_BYTES = 900_000;

/**
 * Base64 image data URLs (snap photos, optical forms) are the single biggest
 * contributor to document size and are only useful on the device that captured
 * them. Strip them before anything is written to the cloud; the local copy in
 * localStorage keeps the image for that device.
 */
function stripImages<T extends { imageUrl?: string }>(items: T[] | undefined): T[] | undefined {
  if (!Array.isArray(items)) return items;
  return items.map(({ imageUrl, ...rest }) => rest as T);
}

/**
 * Removes the largest array fields from `updates` until the serialized document
 * fits within {@link MAX_DOC_BYTES}. Returns the names of any dropped fields.
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

/**
 * Saves full collection data for a user to Firestore. Images are stripped and
 * the payload is trimmed to stay under Firestore's 1 MiB document limit.
 *
 * @throws if the document still exceeds the limit after trimming.
 */
export async function syncUserDataToFirestore(
  userId: string,
  data: {
    profile?: UserProfile;
    snaps?: SnapSolution[];
    mistakes?: MistakeQuestionItem[];
    mockExams?: MockExamRecord[];
    studyPlan?: WeeklyStudyPlan | null;
    flashcards?: Flashcard[];
    subjects?: Subject[];
    targetExam?: ExamCategory;
  },
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const updates: Record<string, any> = {
      userId,
      updatedAt: serverTimestamp(),
    };

    if (data.profile) {
      updates.profile = data.profile;
    }
    if (data.snaps !== undefined) {
      updates.snaps = stripImages(data.snaps);
    }
    if (data.mistakes !== undefined) {
      updates.mistakes = stripImages(data.mistakes);
    }
    if (data.mockExams !== undefined) {
      updates.mockExams = data.mockExams;
    }
    if (data.studyPlan !== undefined) {
      updates.studyPlan = data.studyPlan;
    }
    if (data.flashcards !== undefined) {
      updates.flashcards = data.flashcards;
    }
    if (data.subjects !== undefined && data.targetExam) {
      updates[`subjects_${data.targetExam}`] = data.subjects;
    }

    const dropped = trimOversizedPayload(updates);
    if (JSON.stringify(updates).length > MAX_DOC_BYTES) {
      // Nothing left to drop and still over the limit — let the caller show an error.
      throw new Error('CLOUD_PAYLOAD_TOO_LARGE');
    }
    if (dropped.length > 0) {
      console.warn(`Cloud sync completed without fields: ${dropped.join(', ')}`);
    }

    await setDoc(userDocRef, updates, { merge: true });
  } catch (error) {
    console.error('Error syncing user data to Firestore:', error);
    throw error;
  }
}

/**
 * Loads the user's saved data from Firestore on sign in.
 */
export async function fetchUserDataFromFirestore(userId: string): Promise<CloudUserData | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      profile: data.profile || (data.name ? (data as unknown as UserProfile) : undefined),
      snaps: Array.isArray(data.snaps) ? data.snaps : undefined,
      mistakes: Array.isArray(data.mistakes) ? data.mistakes : undefined,
      mockExams: Array.isArray(data.mockExams) ? data.mockExams : undefined,
      studyPlan: data.studyPlan || undefined,
      flashcards: Array.isArray(data.flashcards) ? data.flashcards : undefined,
      subjects: data.subjects || undefined,
    };
  } catch (error) {
    console.error('Error fetching user data from Firestore:', error);
    throw error;
  }
}
