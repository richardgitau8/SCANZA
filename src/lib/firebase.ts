// SCANZA AI — Firebase client SDK
//
// Auth, Firestore, Functions, and Storage are all initialised from a
// single shared `app` instance. Sensitive operations live exclusively in
// Cloud Functions (see /functions). The frontend never touches the
// Turnitin API or the M-Pesa shortcode directly.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyA3wus47shF8j5PZLz-WYxSmD6WxW_4mGQ',
  authDomain: 'scanza-ai.firebaseapp.com',
  projectId: 'scanza-ai',
  storageBucket: 'scanza-ai.firebasestorage.app',
  messagingSenderId: '251044148705',
  appId: '1:251044148705:web:ecb5087c25c45667df4ea0',
  measurementId: 'G-PLBVLJR3JT',
};

// Avoid double-initialisation during HMR.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Initialise Analytics only in browsers that support it (avoids SSR errors).
if (typeof window !== 'undefined') {
  isSupported()
    .then((ok) => {
      if (ok) getAnalytics(app);
    })
    .catch(() => {
      /* analytics is optional — never let it break the app */
    });
}

export default app;
