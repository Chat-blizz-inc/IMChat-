import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Suppress low-level warnings and only log fatal errors
if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
  try {
    setLogLevel('error');
  } catch (err) {
    console.warn("Failed to set Firestore log level:", err);
  }
}

// Robust Firestore initialization
let dbInstance: any;
try {
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.startsWith('ai-studio-')) {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
} catch (e) {
  console.warn("Failed to initialize Firestore with specific database ID, falling back to default:", e);
  dbInstance = getFirestore(app);
}

// Enable local offline persistence for queries
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(dbInstance).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore offline persistence failed (failed-precondition): multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore offline persistence unimplemented in current browser.");
    }
  });
}

export const db = dbInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isQuotaError = errorMessage.toLowerCase().includes('quota exceeded') || 
                       errorMessage.toLowerCase().includes('quota limit exceeded') || 
                       errorMessage.toLowerCase().includes('resource-exhausted') ||
                       errorMessage.toLowerCase().includes('resource_exhausted') ||
                       errorMessage.toLowerCase().includes('quota reached');
  
  if (isQuotaError) {
    const quotaMessage = "Firestore daily quota has been reached. It will reset automatically tomorrow. Detailed information: https://firebase.google.com/pricing#cloud-firestore (Spark plan / Enterprise edition). Manage / Upgrade Database: https://console.firebase.google.com/project/imchat-3f2ac/firestore/databases/ai-studio-c2f70f42-b524-4182-99d1-3d0031a59b32/data?openUpgradeDialog=true";
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
        detail: {
          message: quotaMessage
        }
      }));
    }
    
    console.warn(`[Firestore Quota Exceeded Intercepted] Operation: ${operationType}, Path: ${path || 'unknown'}.`);
    
    const errInfo: FirestoreErrorInfo = {
      error: `[BUILD SYSTEM EXCEEDED ERROR - FIRESTORE QUOTA REACHED]: ${quotaMessage}`,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    throw new Error(JSON.stringify(errInfo));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

