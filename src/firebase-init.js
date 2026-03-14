/**
 * Firebase initialization module.
 * Centralizes Firebase app, auth, and firestore setup.
 *
 * To configure: replace the firebaseConfig values with your project's credentials.
 * Get them from Firebase Console > Project Settings > Your apps > Web app.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD_placeholder_replace_me",
  authDomain: "easyoriginals-app.firebaseapp.com",
  projectId: "easyoriginals-app",
  storageBucket: "easyoriginals-app.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:placeholder"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
export { doc, setDoc, getDoc };
