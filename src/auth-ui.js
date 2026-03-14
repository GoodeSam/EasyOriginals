/**
 * Auth UI — binds the auth screen and user menu to auth state.
 */
import { getAuthState, enterGuestMode, loginSuccess, logout, onAuthChange } from './auth.js';
import { setRemoteProvider, clearRemoteProvider, pullAll, pushAll } from './sync-storage.js';
import {
  auth, db,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
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
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
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

  function setupRemoteSync(uid) {
    const provider = createFirestoreProvider(uid);
    setRemoteProvider(provider);
    return pullAll();
  }

  // Guest mode
  guestModeBtn.addEventListener('click', () => {
    enterGuestMode();
    clearRemoteProvider();
    goToUpload();
  });

  // Login
  async function handleLogin() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      showError('Please enter email and password.');
      return;
    }
    showError('');
    loginBtn.disabled = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      loginSuccess({ uid: user.uid, email: user.email, displayName: user.displayName || email });
      await setupRemoteSync(user.uid);
      goToUpload();
    } catch (err) {
      showError(friendlyError(err));
    } finally {
      loginBtn.disabled = false;
    }
  }

  // Register
  async function handleRegister() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      showError('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    showError('');
    registerBtn.disabled = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      loginSuccess({ uid: user.uid, email: user.email, displayName: user.displayName || email });
      await setupRemoteSync(user.uid);
      // Push existing local data to the new account
      await pushAll();
      goToUpload();
    } catch (err) {
      showError(friendlyError(err));
    } finally {
      registerBtn.disabled = false;
    }
  }

  loginBtn.addEventListener('click', handleLogin);
  registerBtn.addEventListener('click', handleRegister);

  // Allow Enter key to submit
  authPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Listen for Firebase auth state changes (handles session restore & token refresh)
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const currentState = getAuthState();
      // If already logged in via our auth module, just ensure sync is set up
      if (currentState.mode === 'account' && currentState.user && currentState.user.uid === firebaseUser.uid) {
        await setupRemoteSync(firebaseUser.uid);
        return;
      }
      // Firebase session restored (e.g. page reload) — sync our auth state
      loginSuccess({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email,
      });
      await setupRemoteSync(firebaseUser.uid);
      goToUpload();
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
      userMenu.classList.remove('active');
      // Go back to auth screen
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

  // Auto-skip auth screen if local session is restored (Firebase onAuthStateChanged will handle sync)
  const currentState = getAuthState();
  if (currentState.mode === 'account') {
    goToUpload();
  }

  // Update user display on load
  if (userDisplayName) {
    userDisplayName.textContent = currentState.user
      ? (currentState.user.displayName || currentState.user.email)
      : 'Guest';
  }
}

// Map Firebase error codes to user-friendly messages
function friendlyError(err) {
  const code = err.code || '';
  if (code === 'auth/email-already-in-use') return 'This email is already registered. Try signing in.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection.';
  return err.message || 'An error occurred. Please try again.';
}
