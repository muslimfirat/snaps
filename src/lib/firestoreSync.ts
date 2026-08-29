import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp 
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
  ExamCategory 
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
 * Saves or updates the user profile document in Firestore
 */
export async function syncProfileToFirestore(userId: string, profile: UserProfile): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      ...profile,
      userId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error syncing profile to Firestore:', error);
    throw error;
  }
}

/**
 * Saves full collection data for a user to Firestore
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
  }
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
      updates.snaps = data.snaps;
    }
    if (data.mistakes !== undefined) {
      updates.mistakes = data.mistakes;
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

    await setDoc(userDocRef, updates, { merge: true });
  } catch (error) {
    console.error('Error syncing user data to Firestore:', error);
    throw error;
  }
}

/**
 * Loads the user's saved data from Firestore on sign in
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

/**
 * Subscribes to real-time changes for the user document in Firestore
 */
export function subscribeToUserCloudData(
  userId: string,
  onUpdate: (data: CloudUserData) => void,
  onError?: (err: Error) => void
): () => void {
  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          profile: data.profile || (data.name ? (data as unknown as UserProfile) : undefined),
          snaps: Array.isArray(data.snaps) ? data.snaps : undefined,
          mistakes: Array.isArray(data.mistakes) ? data.mistakes : undefined,
          mockExams: Array.isArray(data.mockExams) ? data.mockExams : undefined,
          studyPlan: data.studyPlan || undefined,
          flashcards: Array.isArray(data.flashcards) ? data.flashcards : undefined,
        });
      }
    },
    (error) => {
      console.warn('Firestore subscription error:', error);
      if (onError) onError(error);
    }
  );
}
