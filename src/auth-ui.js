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
    // Push local data first to preserve newer local changes, then pull remote
    await pushAll();
    await pullAll();
  }

  // Guest mode
  guestModeBtn.addEventListener('click', () => {
    enterGuestMode();
    clearRemoteProvider();
    goToUpload();
  });

  // Google Sign-In
  async function handleGoogleSignIn() {
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
  onAuthStateChanged(auth, async (firebaseUser) => {
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
        await signOut(auth);
      } catch (e) { /* ignore */ }
      clearRemoteProvider();
      logout();
      // Clear user-scoped data from localStorage on sign-out
      SYNC_KEYS.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('reader-api-key');
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
