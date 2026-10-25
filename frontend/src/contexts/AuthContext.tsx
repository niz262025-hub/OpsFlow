import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import {
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getDocs, serverTimestamp, collection, query, where, writeBatch } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '@/src/firebase/config';
import { storage } from '@/src/utils/storage';
import {
  clearMyopsLaunchTicketFromUrl,
  clearStoredMyopsAccessToken,
  endMyopsSession,
  extractMyopsLaunchTicket,
  OPSFLOW_API_TOKEN_KEY,
  redeemMyopsLaunchTicket,
  refreshMyopsSession,
} from '@/src/services/myopsAppAccess';

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
      clearStoredMyopsAccessToken(),
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
          status: 'active',
          createdAt: data.createdAt,
        });
        return;
      }

      setProfile(null);
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
    let unsubscribeAuth: (() => void) | undefined;
    let launchInFlight: string | null = null;
    const auth = getFirebaseAuth();

    const openMyopsTicket = async (ticket: string) => {
      if (!alive || launchInFlight === ticket) return;
      launchInFlight = ticket;
      setLoading(true);
      try {
        await clearMyopsLaunchTicketFromUrl();
        const result = await redeemMyopsLaunchTicket(ticket);
        await storage.secureSet(OPSFLOW_API_TOKEN_KEY, result.accessToken);
        await signInWithCustomToken(auth, result.firebaseCustomToken);
      } catch (error) {
        await clearStoredMyopsAccessToken();
        console.warn('MYOPS could not open OpsFlow:', error);
        setUser(null);
        setProfile(null);
        setLoading(false);
      } finally {
        launchInFlight = null;
      }
    };
    const handleLaunchUrl = (url: string) => {
      const ticket = extractMyopsLaunchTicket(url);
      if (ticket) void openMyopsTicket(ticket);
    };

    const initializeAuth = async () => {
      const initialUrl = await Linking.getInitialURL().catch(() => null);
      const initialTicket = initialUrl ? extractMyopsLaunchTicket(initialUrl) : null;
      if (initialTicket) await openMyopsTicket(initialTicket);
      if (!alive) return;

      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!alive) return;
        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          await clearStoredAuthState();
          if (alive) setLoading(false);
          return;
        }

        const apiToken = await storage.secureGet<string | null>(OPSFLOW_API_TOKEN_KEY, null);
        const entitled = apiToken ? await refreshMyopsSession(apiToken, false) : false;
        if (!entitled) {
          await clearStoredMyopsAccessToken();
          await signOut(auth);
          setUser(null);
          setProfile(null);
          if (alive) setLoading(false);
          return;
        }
        setUser(firebaseUser);
        await loadProfile(firebaseUser);
        if (alive) setLoading(false);
      });
    };
    void initializeAuth();

    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleLaunchUrl(url));
    const handleHashChange = () => {
      if (typeof window !== 'undefined') handleLaunchUrl(window.location.href);
    };
    if (typeof window !== 'undefined') window.addEventListener('hashchange', handleHashChange);
    return () => {
      alive = false;
      unsubscribeAuth?.();
      linkSubscription.remove();
      if (typeof window !== 'undefined') window.removeEventListener('hashchange', handleHashChange);
    };
  }, [clearStoredAuthState, firebaseReady, loadProfile]);

  useEffect(() => {
    if (!user || !firebaseReady || typeof document === 'undefined') return;
    const auth = getFirebaseAuth();
    let lastActivityAt = Date.now() - 60_000;
    const markActivity = () => { lastActivityAt = Date.now(); };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((eventName) => document.addEventListener(eventName, markActivity, { passive: true }));
    const timer = setInterval(() => {
      void (async () => {
        const token = await storage.secureGet<string | null>(OPSFLOW_API_TOKEN_KEY, null);
        const active = token ? await refreshMyopsSession(token, Date.now() - lastActivityAt < 10_000) : false;
        if (!active) {
          await clearStoredMyopsAccessToken();
          await signOut(auth);
        }
      })();
    }, 10_000);
    return () => {
      clearInterval(timer);
      events.forEach((eventName) => document.removeEventListener(eventName, markActivity));
    };
  }, [firebaseReady, user?.uid]);

  const register = useCallback(async (_email: string, _password: string, _displayName: string, _companyName?: string, onStatusChange?: RegisterStatusHandler) => {
    onStatusChange?.('Continue registration through MYOPS.');
    await Linking.openURL('https://www.myops.com.my/');
    throw new Error('Create your account and choose OpsFlow access through MYOPS.');
  }, []);

  const login = useCallback(async (_email: string, _password: string, _companyName?: string, _rememberMe?: boolean) => {
    await Linking.openURL('https://www.myops.com.my/');
    throw new Error('Sign in through MYOPS to open OpsFlow.');
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    void email;
    await Linking.openURL('https://www.myops.com.my/');
  }, []);

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth();
    try {
      if (firebaseReady) {
        const token = await storage.secureGet<string | null>(OPSFLOW_API_TOKEN_KEY, null);
        if (token) await endMyopsSession(token);
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
    const batch = writeBatch(db);
    batch.update(doc(db, 'invite_codes', inv.id), { used: true, usedBy: user.uid, usedAt: serverTimestamp() });
    batch.set(doc(db, 'users', user.uid), {
      companyId: data.companyId,
      role: data.role,
      joinInviteId: inv.id,
    }, { merge: true });
    await batch.commit();
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
