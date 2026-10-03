import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "missing-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const isNew = getApps().length === 0;
export const app = isNew ? initializeApp(config) : getApp();

if (isNew && typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
}

function makeDb(): Firestore {
  if (typeof window === "undefined" || !isNew) return getFirestore(app);
  try {
    // IndexedDB persistence: reads + queued writes survive offline / reload.
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch { return getFirestore(app); }
}

export const auth = getAuth(app);
export const db = makeDb();
export const storage = getStorage(app);
export const functions = getFunctions(app, process.env.NEXT_PUBLIC_FUNCTIONS_REGION || "asia-south1");
