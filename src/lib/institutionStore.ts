/**
 * Institution ("dershane") portal storage — Faz 3b.
 *
 * The portal is no longer a client-side demo: an institution is a Firestore
 * document under `/institutions/{id}` and access is gated by Firebase Auth.
 * A signed-in Google user reaches the portal only if their uid is in that
 * document's `memberUids` array (enforced by `firestore.rules`). There is no
 * separate e-mail/password system anymore.
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  InstitutionAccount,
  InstitutionConfig,
  ClassGroup,
} from '../types';
import {
  DEFAULT_INSTITUTION_CONFIG,
  DEFAULT_CLASS_GROUPS,
  DEFAULT_STUDENTS,
  DEFAULT_INSTITUTION_EXAMS,
} from '../data/institutionData';

export interface CreateInstitutionForm {
  name: string;
  branch: string;
  directorName: string;
  phone: string;
  logoText?: string;
  themeColor?: string;
}

/** Normalises a raw Firestore document into an {@link InstitutionAccount}. */
function docToAccount(id: string, data: Record<string, any>): InstitutionAccount {
  return {
    id,
    ownerUid: data.ownerUid || '',
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    ownerEmail: data.ownerEmail || '',
    name: data.name || data.config?.name || 'Kurum',
    branch: data.branch || data.config?.branch || '',
    directorName: data.directorName || data.config?.directorName || '',
    phone: data.phone || data.config?.phone || '',
    logoText: data.logoText || data.config?.logoText || 'KD',
    themeColor: data.themeColor || data.config?.themeColor || '#4f46e5',
    config: data.config || DEFAULT_INSTITUTION_CONFIG,
    classGroups: Array.isArray(data.classGroups) ? data.classGroups : [],
    students: Array.isArray(data.students) ? data.students : [],
    institutionExams: Array.isArray(data.institutionExams) ? data.institutionExams : [],
    createdAt: data.createdAt || '',
    lastLoginAt: data.lastLoginAt,
  };
}

/**
 * Returns the institution this uid belongs to, or `null` if none.
 * Backed by an `array-contains` query on `memberUids`.
 */
export async function fetchMyInstitution(
  uid: string,
  database: Firestore = db,
): Promise<InstitutionAccount | null> {
  const q = query(
    collection(database, 'institutions'),
    where('memberUids', 'array-contains', uid),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToAccount(d.id, d.data());
}

function deriveLogoText(name: string, provided?: string): string {
  const clean = (provided || '').trim().toUpperCase();
  if (clean) return clean.slice(0, 4);
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'KD'
  );
}

function buildConfig(form: CreateInstitutionForm, logoText: string, themeColor: string): InstitutionConfig {
  return {
    ...DEFAULT_INSTITUTION_CONFIG,
    name: form.name.trim(),
    branch: form.branch.trim() || 'Merkez Şube',
    slogan: 'Snaps Yapay Zeka Destekli Kurumsal Sınav Hazırlık',
    logoText,
    themeColor,
    directorName: form.directorName.trim() || 'Kurum Yöneticisi',
    phone: form.phone.trim() || '0212 000 00 00',
    announcement:
      '📢 Kurumumuza hoş geldiniz! Deneme sınavlarınızı ve öğrenci listelerinizi bu panelden yönetebilirsiniz.',
  };
}

async function writeNewInstitution(
  uid: string,
  ownerEmail: string,
  account: Omit<InstitutionAccount, 'id'>,
  database: Firestore,
): Promise<InstitutionAccount> {
  const ref = doc(collection(database, 'institutions'));
  const full: InstitutionAccount = { ...account, id: ref.id };
  await setDoc(ref, {
    ...full,
    ownerUid: uid,
    memberUids: [uid],
    ownerEmail,
    updatedAt: serverTimestamp(),
  });
  return full;
}

/**
 * Creates a fresh institution owned by `uid` with a single starter class group.
 */
export async function createInstitution(
  uid: string,
  ownerEmail: string,
  form: CreateInstitutionForm,
  database: Firestore = db,
): Promise<InstitutionAccount> {
  const logoText = deriveLogoText(form.name, form.logoText);
  const themeColor = form.themeColor || '#4f46e5';
  const config = buildConfig(form, logoText, themeColor);

  const initialClass: ClassGroup = {
    id: `grp-${Date.now()}-1`,
    name: `${form.name.trim()} 1. Sınıf & Zümre`,
    examType: 'YKS_SAYISAL',
    coachTeacher: form.directorName.trim() || 'Rehberlik Servisi',
    roomNumber: 'Derslik 101',
    targetScoreAverage: '85.0 Net',
  };

  return writeNewInstitution(
    uid,
    ownerEmail,
    {
      ownerUid: uid,
      memberUids: [uid],
      ownerEmail,
      name: config.name,
      branch: config.branch,
      directorName: config.directorName,
      phone: config.phone,
      logoText,
      themeColor,
      config,
      classGroups: [initialClass],
      students: [],
      institutionExams: [],
      createdAt: new Date().toISOString().split('T')[0],
    },
    database,
  );
}

/**
 * Creates an institution pre-filled with the bundled sample class groups,
 * students and exams — for evaluating the portal with realistic data.
 */
export async function seedDemoInstitution(
  uid: string,
  ownerEmail: string,
  database: Firestore = db,
): Promise<InstitutionAccount> {
  const config: InstitutionConfig = { ...DEFAULT_INSTITUTION_CONFIG };
  return writeNewInstitution(
    uid,
    ownerEmail,
    {
      ownerUid: uid,
      memberUids: [uid],
      ownerEmail,
      name: config.name,
      branch: config.branch,
      directorName: config.directorName,
      phone: config.phone,
      logoText: config.logoText,
      themeColor: config.themeColor,
      config,
      classGroups: DEFAULT_CLASS_GROUPS,
      students: DEFAULT_STUDENTS,
      institutionExams: DEFAULT_INSTITUTION_EXAMS,
      createdAt: new Date().toISOString().split('T')[0],
    },
    database,
  );
}

/**
 * Persists a partial update to an institution document. `ownerUid` and
 * `memberUids` are never sent from here, so the security rules' owner/member
 * invariants always hold.
 */
export async function syncInstitutionToFirestore(
  institutionId: string,
  partial: Partial<Pick<InstitutionAccount,
    'config' | 'classGroups' | 'students' | 'institutionExams' |
    'name' | 'branch' | 'directorName' | 'phone' | 'logoText' | 'themeColor'>>,
  database: Firestore = db,
): Promise<void> {
  await setDoc(
    doc(database, 'institutions', institutionId),
    { ...partial, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
