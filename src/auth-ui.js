/**
 * Auth UI — binds the auth screen and user menu to auth state.
 */
import { getAuthState, enterGuestMode, loginSuccess, logout, onAuthChange } from './auth.js';
import { setRemoteProvider, clearRemoteProvider, pullAll, pushAll } from './sync-storage.js';

// ===== Firebase-compatible remote provider =====
function createFirebaseProvider(firebaseApp) {
  const { getFirestore, doc, setDoc, getDoc } = window.firebaseFirestore || {};
  if (!getFirestore) return null;

  const db = getFirestore(firebaseApp);

  return {
    async push(key, value) {
      const state = getAuthState();
      if (!state.user) return;
      const ref = doc(db, 'users', state.user.uid);
      await setDoc(ref, { [key]: value }, { merge: true });
    },
    async pull() {
      const state = getAuthState();
      if (!state.user) return {};
      const ref = doc(db, 'users', state.user.uid);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : {};
    },
    async pushAll(data) {
      const state = getAuthState();
      if (!state.user) return;
      const ref = doc(db, 'users', state.user.uid);
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

  // Guest mode
  guestModeBtn.addEventListener('click', () => {
    enterGuestMode();
    clearRemoteProvider();
    goToUpload();
  });

  // Login with Firebase
  async function handleLogin() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      showError('Please enter email and password.');
      return;
    }
    showError('');
    try {
      const { getAuth, signInWithEmailAndPassword } = window.firebaseAuth || {};
      if (!getAuth) {
        showError('Firebase not loaded. Use guest mode or try again later.');
        return;
      }
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      loginSuccess({ uid: user.uid, email: user.email, displayName: user.displayName || email });
      await setupRemoteSync();
      goToUpload();
    } catch (err) {
      showError(err.message || 'Login failed.');
    }
  }

  // Register with Firebase
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
    try {
      const { getAuth, createUserWithEmailAndPassword } = window.firebaseAuth || {};
      if (!getAuth) {
        showError('Firebase not loaded. Use guest mode or try again later.');
        return;
      }
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      loginSuccess({ uid: user.uid, email: user.email, displayName: user.displayName || email });
      await setupRemoteSync();
      // Push existing local data to new account
      await pushAll();
      goToUpload();
    } catch (err) {
      showError(err.message || 'Registration failed.');
    }
  }

  async function setupRemoteSync() {
    if (window.firebaseApp && window.firebaseFirestore) {
      const provider = createFirebaseProvider(window.firebaseApp);
      if (provider) {
        setRemoteProvider(provider);
        await pullAll();
      }
    }
  }

  loginBtn.addEventListener('click', handleLogin);
  registerBtn.addEventListener('click', handleRegister);

  // Allow Enter key to submit
  authPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
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
        const { getAuth, signOut } = window.firebaseAuth || {};
        if (getAuth) await signOut(getAuth());
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

  // Auto-skip auth screen if session is restored
  const currentState = getAuthState();
  if (currentState.mode === 'account') {
    setupRemoteSync();
    goToUpload();
  }

  // Update user display on load
  if (userDisplayName) {
    userDisplayName.textContent = currentState.user
      ? (currentState.user.displayName || currentState.user.email)
      : 'Guest';
  }
}
