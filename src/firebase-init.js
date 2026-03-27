/**
 * Firebase initialization module.
 * Centralizes Firebase app and firestore setup.
 */
import { initializeApp } from 'firebase/app';
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

let app, db;
if (_hasPlaceholders) {
  console.warn('Firebase config contains placeholder values. Sync features are disabled.');
  app = null;
  db = null;
} else {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    throw new Error('Firebase initialization failed: ' + err.message + '. Check your Firebase config.');
  }
}

export { app, db };
export { doc, setDoc, getDoc };
