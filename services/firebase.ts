import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  Auth,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const env = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : ((typeof process !== 'undefined' && process.env) ? process.env : {}) as any;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

/**
 * Validates whether the required Firebase credentials have been configured in .env.local
 */
export const isFirebaseConfigured = (): boolean => {
  const key = firebaseConfig.apiKey;
  const project = firebaseConfig.projectId;
  return Boolean(
    key && 
    project && 
    typeof key === 'string' && 
    typeof project === 'string' && 
    !key.includes('YOUR_') && 
    key.trim().length > 5 &&
    !project.includes('YOUR_') && 
    project.trim().length > 2
  );
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    // Ensure persistence is set to localStorage
    setPersistence(authInstance, browserLocalPersistence).catch(() => {});
  } catch (err) {
    console.warn('[Firebase] Initialization failed:', err);
  }
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');
