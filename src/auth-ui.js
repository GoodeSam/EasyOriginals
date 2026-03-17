/**
 * Auth UI — binds the auth screen and user menu to auth state.
 * Uses Google Sign-In (no email/password required).
 */
import { getAuthState, enterGuestMode, loginSuccess, logout, onAuthChange } from './auth.js';
import { setRemoteProvider, clearRemoteProvider, pullAll, pushAll, SYNC_KEYS } from './sync-storage.js';
import {
  auth, db,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  doc, setDoc, getDoc,
} from './firebase-init.js';

// ===== Firestore remote provider =====
/** Max Firestore doc size is ~1 MiB; warn at 800 KiB to avoid silent failures */
const FIRESTORE_DOC_WARN_BYTES = 800 * 1024;

function estimateDocSize(data) {
  try { return new Blob([JSON.stringify(data)]).size; } catch { return 0; }
}

function createFirestoreProvider(uid) {
  return {
    async push(key, value) {
      const ref = doc(db, 'users', uid);
      await setDoc(ref, { [key]: value }, { merge: true });
    },
    async pull() {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : {};
    },
    async pushAll(data) {
      const size = estimateDocSize(data);
      if (size > FIRESTORE_DOC_WARN_BYTES) {
        console.warn(`Firestore document approaching size limit (${(size / 1024).toFixed(0)} KiB). Consider pruning old history/notes.`);
      }
      const ref = doc(db, 'users', uid);
      await setDoc(ref, data, { merge: true });
    },
  };
}

// ===== UI Binding =====
export function bindAuthUI() {
  const authScreen = document.getElementById('authScreen');
  const uploadScreen = document.getElementById('uploadScreen');
  const guestModeBtn = document.getElementById('guestModeBtn');
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const authError = document.getElementById('authError');
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userMenu = document.getElementById('userMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  const userDisplayName = document.getElementById('userDisplayName');

  if (!authScreen) return;

  function showError(msg) {
    if (authError) {
      authError.textContent = msg;
      authError.style.display = msg ? 'block' : 'none';
    }
  }

  function goToUpload() {
    authScreen.classList.remove('active');
    uploadScreen.classList.add('active');
  }

  async function setupRemoteSync(uid) {
    const provider = createFirestoreProvider(uid);
    setRemoteProvider(provider);
    // Pull remote first to get authoritative state
    const remoteData = await pullAll();
    // Only push local data if there are keys not yet in remote (avoids redundant writes)
    const localKeys = SYNC_KEYS.filter(k => {
      const val = localStorage.getItem(k);
      return val !== null && val !== (remoteData[k] ?? null);
    });
    if (localKeys.length > 0) await pushAll();
  }

  // Guest mode
  guestModeBtn.addEventListener('click', () => {
    enterGuestMode();
    clearRemoteProvider();
    goToUpload();
  });

  // Google Sign-In
  async function handleGoogleSignIn() {
    if (!auth) { showError('Google Sign-In unavailable (Firebase not configured)'); return; }
    showError('');
    googleSignInBtn.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;
      loginSuccess({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
      });
      await setupRemoteSync(user.uid);
      goToUpload();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        showError(friendlyError(err));
      }
    } finally {
      googleSignInBtn.disabled = false;
    }
  }

  googleSignInBtn.addEventListener('click', handleGoogleSignIn);

  // Listen for Firebase auth state changes (handles session restore & token refresh)
  // Guard: skip when Firebase is disabled (auth === null with placeholder config)
  if (!auth) {
    // Firebase unavailable — disable Google sign-in, allow guest-only mode
    googleSignInBtn.disabled = true;
    googleSignInBtn.title = 'Google Sign-In unavailable (Firebase not configured)';
  }
  if (auth) onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const currentState = getAuthState();
      if (currentState.mode === 'account' && currentState.user && currentState.user.uid === firebaseUser.uid) {
        try { await setupRemoteSync(firebaseUser.uid); } catch (e) { showError('Sync failed: ' + e.message); }
        return;
      }
      loginSuccess({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email,
      });
      try { await setupRemoteSync(firebaseUser.uid); } catch (e) { showError('Sync failed: ' + e.message); }
      goToUpload();
    } else {
      // Firebase session expired or user signed out externally — downgrade to guest
      const currentState = getAuthState();
      if (currentState.mode === 'account') {
        clearRemoteProvider();
        enterGuestMode();
        uploadScreen.classList.remove('active');
        document.getElementById('readerScreen').classList.remove('active');
        authScreen.classList.add('active');
      }
    }
  });

  // User menu
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', () => {
      userMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.remove('active');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        if (auth) await signOut(auth);
      } catch (e) {
        console.warn('Sign-out error:', e.message);
      }
      clearRemoteProvider();
      logout();
      // Clear user-scoped data from localStorage on sign-out
      SYNC_KEYS.forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem('reader-api-key');
      localStorage.removeItem('reader-api-key'); // clean up any legacy localStorage keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('reader-bookmark-')) localStorage.removeItem(key);
      }
      userMenu.classList.remove('active');
      uploadScreen.classList.remove('active');
      document.getElementById('readerScreen').classList.remove('active');
      authScreen.classList.add('active');
    });
  }

  // Update user display on auth changes
  onAuthChange((state) => {
    if (userDisplayName) {
      userDisplayName.textContent = state.user ? (state.user.displayName || state.user.email) : 'Guest';
    }
    if (userMenuBtn) {
      userMenuBtn.title = state.mode === 'account' ? state.user.email : 'Guest mode';
    }
  });

  // Auto-skip auth screen if local session is restored
  const currentState = getAuthState();
  if (currentState.mode === 'account') {
    goToUpload();
  }

  if (userDisplayName) {
    userDisplayName.textContent = currentState.user
      ? (currentState.user.displayName || currentState.user.email)
      : 'Guest';
  }
}

function friendlyError(err) {
  const code = err.code || '';
  if (code === 'auth/popup-blocked') return 'Pop-up blocked. Please allow pop-ups for this site.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.';
  return err.message || 'Sign-in failed. Please try again.';
}
