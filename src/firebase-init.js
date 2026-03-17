/**
 * Firebase initialization module.
 * Centralizes Firebase app, auth, and firestore setup.
 * Uses Google Sign-In (no email/password required).
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_placeholder_replace_me",
  authDomain: "easyoriginals-app.firebaseapp.com",
  projectId: "easyoriginals-app",
  storageBucket: "easyoriginals-app.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:placeholder"
};

const _hasPlaceholders = firebaseConfig.apiKey.includes('placeholder') || firebaseConfig.appId.includes('placeholder') || firebaseConfig.messagingSenderId === '000000000000';

let app, auth, db;
if (_hasPlaceholders) {
  console.warn('Firebase config contains placeholder values. Auth and sync features are disabled.');
  // Create null stubs so imports don't crash — auth-ui checks before using
  app = null;
  auth = null;
  db = null;
} else {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    throw new Error('Firebase initialization failed: ' + err.message + '. Check your Firebase config.');
  }
}

export { app, auth, db };
export { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
export { doc, setDoc, getDoc };
