import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  browserLocalPersistence,
  inMemoryPersistence,
  setPersistence,
} from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, serverTimestamp, collection, query, where, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '@/src/firebase/config';
import { storage } from '@/src/utils/storage';
import { buildTrialCompanyData } from '@/src/utils/trialFlow';

declare global {
  interface Window {
    __BIZFLOW_DEBUG__?: {
      uid?: string | null;
      companyId?: string | null;
      route?: string;
    };
  }
}

export type Role = 'admin' | 'manager' | 'cashier';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string | null;
  companyId?: string | null;
  role: Role;
  status?: string;
  trialDays?: number;
  trialEndsAt?: any;
  createdAt?: any;
}

interface InviteCodeDoc {
  code: string;
  companyId: string;
  role: Role;
  used?: boolean;
}

type RegisterStatusHandler = (message: string) => void;

interface AuthCtx {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  firebaseReady: boolean;
  register: (email: string, password: string, displayName: string, companyName?: string, onStatusChange?: RegisterStatusHandler) => Promise<void>;
  login: (email: string, password: string, companyName?: string, rememberMe?: boolean) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  joinCompanyByCode: (code: string) => Promise<{ companyId: string; role: Role }>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

function normalizeAuthError(error: unknown, fallbackMessage: string) {
  const err = error as Error & { code?: string };
  const code = err?.code || '';
  let message = fallbackMessage;

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      message = 'Invalid email or password.';
      break;
    case 'auth/user-disabled':
      message = 'This account has been disabled.';
      break;
    case 'auth/network-request-failed':
    case 'auth/network-error':
      message = 'Network error. Please check your connection and try again.';
      break;
    case 'auth/configuration-not-found':
      message = 'Firebase is not configured for this deployment.';
      break;
    case 'auth/too-many-requests':
      message = 'Too many attempts. Please try again later.';
      break;
    default:
      if (err?.message) message = err.message;
      break;
  }

  const normalized = new Error(message) as Error & { code?: string };
  normalized.code = code || 'auth/unknown-error';
  return normalized;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const firebaseReady = isFirebaseConfigured;

  const clearStoredAuthState = useCallback(async () => {
    await Promise.all([
      storage.removeItem('auth:user'),
      storage.removeItem('auth:profile'),
      storage.removeItem('auth:company'),
      storage.removeItem('auth:workspace'),
      storage.secureRemove('auth:session'),
      storage.secureRemove('auth:token'),
      storage.secureRemove('auth:company'),
      storage.secureRemove('auth:workspace'),
    ]);
  }, []);

  const loadProfile = useCallback(async (u: FirebaseUser) => {
    try {
      const db = getFirebaseDb();
      const profileRef = doc(db, 'users', u.uid);
      const snap = await getDoc(profileRef);

      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile>;
        const resolvedCompanyId = data.companyId ?? null;

        setProfile({
          uid: u.uid,
          email: data.email || u.email || '',
          displayName: data.displayName,
          companyName: data.companyName || null,
          companyId: resolvedCompanyId,
          role: (data.role as Role) || 'admin',
          status: data.status || 'trial',
          trialDays: data.trialDays || 7,
          trialEndsAt: data.trialEndsAt,
          createdAt: data.createdAt,
        });
        return;
      }

      await setDoc(profileRef, {
        email: u.email || '',
        displayName: u.displayName || null,
        companyName: null,
        companyId: null,
        role: 'admin',
        createdAt: serverTimestamp(),
      }, { merge: true });
      setProfile({
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || undefined,
        companyName: null,
        companyId: null,
        role: 'admin',
        status: 'trial',
        trialDays: 7,
      });
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__BIZFLOW_DEBUG__ = {
        uid: user?.uid ?? null,
        companyId: profile?.companyId ?? null,
        route: window.location.pathname,
      };
    }
  }, [loading, profile?.companyId, user?.uid]);

  useEffect(() => {
    if (!firebaseReady) {
      setUser(null);
      setProfile(null);
      void clearStoredAuthState();
      setLoading(false);
      return;
    }

    let alive = true;
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!alive) return;
      console.log('[bizflow-register] auth state received', u ? { uid: u.uid } : { uid: null });
      setUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setProfile(null);
        await clearStoredAuthState();
      }
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [clearStoredAuthState, firebaseReady, loadProfile]);

  const register = useCallback(async (email: string, password: string, displayName: string, companyName?: string, onStatusChange?: RegisterStatusHandler) => {
    if (!firebaseReady) {
      const error = new Error('Authentication is unavailable because Firebase is not configured') as Error & { code?: string };
      error.code = 'auth/configuration-not-found';
      throw error;
    }

    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const cleanEmail = email.trim();
    const cleanDisplayName = displayName.trim();
    const cleanCompanyName = companyName?.trim() || 'My Business';
    setLoading(true);
    try {
      onStatusChange?.('Creating your Firebase account…');
      await setPersistence(auth, browserLocalPersistence);
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      console.log('[bizflow-register] auth created', { uid: cred.user.uid, email: cleanEmail });
      onStatusChange?.('Firebase account ready. Finishing onboarding…');

      if (cleanDisplayName) await updateProfile(cred.user, { displayName: cleanDisplayName });

      const trialCompany = buildTrialCompanyData(cleanCompanyName, cleanDisplayName, cleanEmail);
      const companyRef = doc(collection(db, 'companies'));
      const companyData = {
        name: cleanCompanyName,
        companyName: cleanCompanyName,
        businessName: cleanCompanyName,
        ownerName: cleanDisplayName,
        ownerEmail: cleanEmail,
        email: cleanEmail,
        ownerUid: cred.user.uid,
        status: 'Trial',
        plan: 'basic',
        trialDays: 7,
        trialStartDate: trialCompany.trialStartsAt,
        trialStartsAt: trialCompany.trialStartsAt,
        trialEnd: trialCompany.trialEndsAt,
        trialEndsAt: trialCompany.trialEndsAt,
        subscriptionEnd: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('[bizflow-register] company write started', { companyName: cleanCompanyName, ownerUid: cred.user.uid });
      onStatusChange?.('Creating your company workspace…');
      await setDoc(companyRef, companyData);
      console.log('[bizflow-register] company write completed', { companyId: companyRef.id });

      const companyId = companyRef.id;
      console.log('[bizflow-register] profile write completed', { uid: cred.user.uid, companyId });
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cleanEmail,
        displayName: cleanDisplayName,
        companyId,
        companyName: cleanCompanyName,
        role: 'admin',
        plan: 'basic',
        status: 'trial',
        trialDays: 7,
        trialStartsAt: trialCompany.trialStartsAt,
        trialEndsAt: trialCompany.trialEndsAt,
        createdAt: serverTimestamp(),
      }, { merge: true });
      console.log('[bizflow-register] trial write completed', { companyId, trialDays: 7, trialEndsAt: trialCompany.trialEndsAt.toISOString() });

      await auth.authStateReady();
      const readyUser = auth.currentUser;
      if (!readyUser || readyUser.uid !== cred.user.uid) {
        throw new Error('Firebase did not confirm the new session.');
      }

      const sessionPayload = { uid: readyUser.uid, email: readyUser.email ?? '', companyId, companyName: cleanCompanyName };
      await storage.setItem('auth:user', JSON.stringify(sessionPayload));
      await storage.setItem('auth:company', companyId);
      await storage.secureSet('auth:session', JSON.stringify(sessionPayload));
      await loadProfile(readyUser);
      setUser(readyUser);
      onStatusChange?.('Redirecting to your dashboard…');
      console.log('[bizflow-register] redirect started', { path: '/app' });
    } catch (error) {
      console.error('[bizflow-register] onboarding failed', error);
      throw normalizeAuthError(error, 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [firebaseReady, loadProfile]);

  const login = useCallback(async (email: string, password: string, companyName?: string, rememberMe?: boolean) => {
    const cleanEmail = email.trim();
    const cleanCompany = companyName?.trim() || '';

    if (!cleanEmail || !password) {
      throw normalizeAuthError({ code: 'auth/invalid-credential' }, 'Email and password are required.');
    }

    if (!firebaseReady) {
      throw normalizeAuthError({ code: 'auth/configuration-not-found' }, 'Authentication is unavailable because Firebase is not configured.');
    }

    const auth = getFirebaseAuth();
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : inMemoryPersistence);
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (cred.user) {
        const db = getFirebaseDb();
        const profileRef = doc(db, 'users', cred.user.uid);
        const profileSnap = await getDoc(profileRef);
        const nextRole = (profileSnap.exists() ? profileSnap.data().role : 'admin') as Role;

        await setDoc(profileRef, {
          email: cleanEmail,
          displayName: cred.user.displayName || null,
          companyName: cleanCompany || profileSnap.data()?.companyName || null,
          companyId: profileSnap.exists() ? profileSnap.data().companyId ?? null : null,
          role: nextRole,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        setUser(cred.user);
        await storage.setItem('auth:user', JSON.stringify({ uid: cred.user.uid, email: cred.user.email ?? '', companyName: cleanCompany || '' }));
        await storage.secureSet('auth:session', JSON.stringify({ uid: cred.user.uid, email: cred.user.email ?? '', companyName: cleanCompany || '' }));
        await loadProfile(cred.user);
      }
    } catch (error) {
      throw normalizeAuthError(error, 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [firebaseReady, loadProfile]);

  const forgotPassword = useCallback(async (email: string) => {
    if (!firebaseReady) {
      const error = new Error('Authentication is unavailable because Firebase is not configured') as Error & { code?: string };
      error.code = 'auth/configuration-not-found';
      throw error;
    }
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
  }, [firebaseReady]);

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth();
    try {
      if (firebaseReady) {
        await signOut(auth);
      }
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
      await clearStoredAuthState();
    }
  }, [clearStoredAuthState, firebaseReady]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    if (!firebaseReady) {
      setProfile(null);
      return;
    }
    await loadProfile(user);
  }, [firebaseReady, loadProfile, user]);

  const joinCompanyByCode = useCallback(async (code: string) => {
    if (!user) throw new Error('Not signed in');
    if (!firebaseReady) {
      throw new Error('Authentication is unavailable because Firebase is not configured');
    }
    const db = getFirebaseDb();
    const upper = code.trim().toUpperCase();
    const snap = await getDocs(query(collection(db, 'invite_codes'), where('code', '==', upper)));
    if (snap.empty) throw new Error('Invalid invite code');
    const inv = snap.docs[0];
    const data = inv.data() as InviteCodeDoc;
    if (data.used) throw new Error('This code has already been used');
    await setDoc(doc(db, 'users', user.uid), { companyId: data.companyId, role: data.role }, { merge: true });
    await updateDoc(doc(db, 'invite_codes', inv.id), { used: true, usedBy: user.uid, usedAt: serverTimestamp() });
    await loadProfile(user);
    return { companyId: data.companyId, role: data.role };
  }, [firebaseReady, loadProfile, user]);

  const value = useMemo<AuthCtx>(() => ({
    user,
    profile,
    loading,
    firebaseReady,
    register,
    login,
    forgotPassword,
    logout,
    refreshProfile,
    joinCompanyByCode,
  }), [
    user,
    profile,
    loading,
    firebaseReady,
    register,
    login,
    forgotPassword,
    logout,
    refreshProfile,
    joinCompanyByCode,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
