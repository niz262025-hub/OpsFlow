import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, serverTimestamp, collection, query, where, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '@/src/firebase/config';

export type Role = 'admin' | 'manager' | 'cashier';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  companyId?: string | null;
  role: Role;
  createdAt?: any;
}

interface AuthCtx {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  firebaseReady: boolean;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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
  const [firebaseReady] = useState(isFirebaseConfigured);

  const loadProfile = async (u: FirebaseUser) => {
    try {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        setProfile({ uid: u.uid, ...(snap.data() as any) });
      } else {
        setProfile({ uid: u.uid, email: u.email || '', role: 'admin', companyId: null });
      }
    } catch (e) {
      setProfile({ uid: u.uid, email: u.email || '', role: 'admin', companyId: null });
    }
  };

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseReady]);

  const register = async (email: string, password: string, displayName: string) => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName) await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: email.trim(),
      displayName,
      companyId: null,
      role: 'admin',
      createdAt: serverTimestamp(),
    });
  };

  const login = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const forgotPassword = async (email: string) => {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  const joinCompanyByCode = async (code: string) => {
    if (!user) throw new Error('Not signed in');
    const db = getFirebaseDb();
    const upper = code.trim().toUpperCase();
    const snap = await getDocs(query(collection(db, 'invite_codes'), where('code', '==', upper)));
    if (snap.empty) throw new Error('Invalid invite code');
    const inv = snap.docs[0];
    const data = inv.data() as any;
    if (data.used) throw new Error('This code has already been used');
    await updateDoc(doc(db, 'users', user.uid), { companyId: data.companyId, role: data.role });
    await updateDoc(doc(db, 'invite_codes', inv.id), { used: true, usedBy: user.uid, usedAt: serverTimestamp() });
    await loadProfile(user);
    return { companyId: data.companyId, role: data.role as Role };
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, firebaseReady, register, login, forgotPassword, logout, refreshProfile, joinCompanyByCode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
