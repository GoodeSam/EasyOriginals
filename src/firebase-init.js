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

if (firebaseConfig.apiKey.includes('placeholder') || firebaseConfig.appId.includes('placeholder') || firebaseConfig.messagingSenderId === '000000000000') {
  console.warn('Firebase config contains placeholder values. Auth and sync features will not work until real Firebase credentials are configured.');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
export { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
export { doc, setDoc, getDoc };
