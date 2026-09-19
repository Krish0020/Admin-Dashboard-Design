import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Config comes from environment variables (.env.local locally, Vercel project
 * settings in production) so the same code can point at a staging project and
 * a production project without editing source.
 *
 * Note for review: a Firebase web API key is a public identifier, not a
 * secret — the browser must send it with every request. Access is controlled
 * by Firebase Authentication plus the Firestore security rules in
 * firestore.rules, which is where the real enforcement lives.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Fails loudly at boot instead of producing a blank white screen later.
  throw new Error(
    "Firebase environment variables are missing. Copy .env.example to .env.local (and add the same keys in Vercel)."
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
