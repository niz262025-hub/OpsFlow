// Firebase initialization for Expo (JS SDK).
// Reads config from EXPO_PUBLIC_FIREBASE_* env vars — never hardcode credentials.
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  // @ts-ignore — getReactNativePersistence is exported by firebase/auth but not typed
  getReactNativePersistence,
} from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* in /app/frontend/.env and restart Expo.'
    );
  }
  if (app) return app;
  app = getApps()[0] || initializeApp(firebaseConfig as any);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const a = ensureApp();
  try {
    if (Platform.OS === 'web') {
      _auth = getAuth(a);
      _auth.setPersistence(browserLocalPersistence).catch(() => {});
    } else {
      _auth = initializeAuth(a, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch {
    _auth = getAuth(a);
  }
  return _auth!;
}

export function getFirebaseDb(): Firestore {
  if (_db) return _db;
  const a = ensureApp();
  try {
    _db = initializeFirestore(a, {
      experimentalForceLongPolling: Platform.OS !== 'web',
      ignoreUndefinedProperties: true,
    } as any);
  } catch {
    _db = getFirestore(a);
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  const a = ensureApp();
  _storage = getStorage(a);
  return _storage;
}
