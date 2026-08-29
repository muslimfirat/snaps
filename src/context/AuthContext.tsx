import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  signInWithGoogle as fbSignInWithGoogle, 
  logOutFromFirebase as fbLogOut, 
  FirebaseUser 
} from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  fetchUserDataFromFirestore, 
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        setSyncStatus('synced');
        setLastSyncedTime(new Date());
      } else {
        setSyncStatus('idle');
      }
    });

    return () => unsubscribe();
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

  const syncCurrentDataToCloud = async (data: Parameters<typeof syncUserDataToFirestore>[1]) => {
    if (!currentUser) return;
    try {
      setSyncStatus('syncing');
      await syncUserDataToFirestore(currentUser.uid, data);
      setSyncStatus('synced');
      setLastSyncedTime(new Date());
    } catch (err) {
      console.error('Cloud sync failed:', err);
      setSyncStatus('error');
    }
  };

  const fetchCloudData = async (): Promise<CloudUserData | null> => {
    if (!currentUser) return null;
    try {
      setSyncStatus('syncing');
      const cloudData = await fetchUserDataFromFirestore(currentUser.uid);
      setSyncStatus('synced');
      setLastSyncedTime(new Date());
      return cloudData;
    } catch (err) {
      console.error('Fetch cloud data error:', err);
      setSyncStatus('error');
      return null;
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
