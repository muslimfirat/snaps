import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  auth, 
  signInWithGoogle as fbSignInWithGoogle, 
  logOutFromFirebase as fbLogOut, 
  FirebaseUser 
} from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  fetchAllCollections,
  migrateUserToSubcollections,
  syncUserDataToFirestore,
  SyncStatus,
  CloudUserData
} from '../lib/firestoreSync';
import { haptics } from '../lib/haptics';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  syncStatus: SyncStatus;
  lastSyncedTime: Date | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncCurrentDataToCloud: (data: Parameters<typeof syncUserDataToFirestore>[1]) => Promise<void>;
  fetchCloudData: () => Promise<CloudUserData | null>;
  /** Re-attempts the most recent failed cloud sync. */
  retrySync: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Accumulated payload of everything synced this session, used to re-push on retry.
  const pendingPayloadRef = useRef<Parameters<typeof syncUserDataToFirestore>[1]>({});
  const currentUserRef = useRef<FirebaseUser | null>(null);
  currentUserRef.current = currentUser;

  useEffect(() => {
    // Ağ engelli / Firebase yavaşsa header'da sonsuz spinner kalmasın (Faz 9.3).
    const failsafe = setTimeout(() => setLoading(false), 8000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(failsafe);
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        setSyncStatus('synced');
        setLastSyncedTime(new Date());
      } else {
        setSyncStatus('idle');
      }
    });

    return () => {
      clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setSyncStatus('syncing');
    try {
      haptics.selection();
      const user = await fbSignInWithGoogle();
      setCurrentUser(user);
      setSyncStatus('synced');
      setLastSyncedTime(new Date());
      haptics.success();
    } catch (error: any) {
      console.error('Google Sign In failed:', error);
      // Don't show scary error if user simply closed the popup
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setAuthError(error.message || 'Google ile giriş yapılırken bir sorun oluştu.');
        setSyncStatus('error');
      } else {
        setSyncStatus('idle');
      }
      haptics.warning();
    }
  };

  const signOut = async () => {
    try {
      haptics.light();
      await fbLogOut();
      setCurrentUser(null);
      setSyncStatus('idle');
    } catch (error: any) {
      console.error('Logout error:', error);
      setAuthError('Çıkış yapılırken bir hata oluştu.');
    }
  };

  const syncCurrentDataToCloud = useCallback(
    async (data: Parameters<typeof syncUserDataToFirestore>[1]) => {
      const user = currentUserRef.current;
      if (!user) return;
      // Remember what we tried to push so retrySync() can resend it.
      pendingPayloadRef.current = { ...pendingPayloadRef.current, ...data };
      try {
        setSyncStatus('syncing');
        await syncUserDataToFirestore(user.uid, pendingPayloadRef.current);
        pendingPayloadRef.current = {};
        setSyncStatus('synced');
        setLastSyncedTime(new Date());
      } catch (err) {
        console.error('Cloud sync failed:', err);
        setSyncStatus('error');
      }
    },
    [],
  );

  const retrySync = useCallback(async () => {
    await syncCurrentDataToCloud({});
  }, [syncCurrentDataToCloud]);

  const fetchCloudData = async (): Promise<CloudUserData | null> => {
    if (!currentUser) return null;
    try {
      setSyncStatus('syncing');
      // Move any legacy embedded arrays into subcollections before the first read.
      // Idempotent + localStorage-guarded, so this is a no-op after the first run.
      await migrateUserToSubcollections(currentUser.uid);
      const cloudData = await fetchAllCollections(currentUser.uid);
      setSyncStatus('synced');
      setLastSyncedTime(new Date());
      return cloudData;
    } catch (err) {
      console.error('Fetch cloud data error:', err);
      setSyncStatus('error');
      // Propagate so the caller does not mistake a failed read for "new user"
      // and reseed / overwrite cloud data.
      throw err;
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        syncStatus,
        lastSyncedTime,
        signInWithGoogle,
        signOut,
        syncCurrentDataToCloud,
        fetchCloudData,
        retrySync,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
