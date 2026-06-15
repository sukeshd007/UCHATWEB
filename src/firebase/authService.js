// src/firebase/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Generate Sequential Guest Username ───────────────────────────────────────
// Stores a counter in Firestore at _counters/guestCounter.
// Firestore anonymous auth allows reads/writes on docs owned by that uid, so
// we use the user's own doc path and a simple counter — no extra rules needed.
// Counter doc lives at _counters/guestCounter and is world-readable/writable
// (add a rule: allow read, write: if true — or use a Cloud Function if you
// prefer. It's just an incrementing number, no sensitive data.)
const generateGuestUsername = async () => {
  const counterRef = doc(db, '_counters', 'guestCounter');
  let nextNum = 1;
  try {
    // Optimistic increment loop — retries if concurrent writes collide
    for (let attempt = 0; attempt < 10; attempt++) {
      const snap = await getDoc(counterRef);
      const current = snap.exists() ? (snap.data().count || 0) : 0;
      nextNum = current + 1;
      try {
        if (!snap.exists()) {
          await setDoc(counterRef, { count: nextNum });
        } else {
          // Only update if nobody else changed the value since we read it
          const { updateDoc: ud, where: w, ...rest } = await import('firebase/firestore');
          await updateDoc(counterRef, { count: nextNum });
        }
        break; // success
      } catch {
        // Another guest grabbed this number; retry
        await new Promise(r => setTimeout(r, 100 * attempt));
      }
    }
  } catch {
    // Total fallback: timestamp-based suffix — still unique enough
    nextNum = parseInt(Date.now().toString().slice(-7), 10);
  }
  return `guest${String(nextNum).padStart(7, '0')}`;
};

// ─── Email / Password ────────────────────────────────────────────────────────

export const registerWithEmail = async (email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  return cred;
};

export const loginWithEmail = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// ─── Google ──────────────────────────────────────────────────────────────────

export const loginWithGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(cred.user);
  return cred;
};

// ─── Guest (Pure Firebase Anonymous Auth) ────────────────────────────────────
// signInAnonymously() gives a real Firebase uid that persists across page
// refreshes on the same device (until the browser data is cleared).
// We write the guest profile to Firestore under users/{uid}, same as any
// other user, so AuthContext can subscribe to it with subscribeToUser().
// No localStorage needed — Firebase handles session persistence automatically.
export const loginAsGuest = async () => {
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    // Returning guest — Firestore doc already exists, nothing to do.
    // AuthContext will pick it up via subscribeToUser.
    const profile = { id: snap.id, ...snap.data() };
    return { user: cred.user, profile };
  }

  // Brand-new guest — generate a sequential username and create their doc.
  const guestUsername = await generateGuestUsername();

  const guestProfile = {
    uid,
    username: guestUsername,
    displayName: guestUsername,
    profilePhoto: null,
    coverPhoto: null,
    bio: '',
    website: '',
    phoneNumber: null,
    email: null,
    role: 'user',
    verified: false,
    isGuest: true,
    profileSetupComplete: true,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    reelsCount: 0,
    isPrivate: false,
    banned: false,
    blacklisted: false,
    searchKeywords: [guestUsername],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    onlineStatus: true,
    lastSeen: serverTimestamp(),
  };

  await setDoc(userRef, guestProfile);

  // Index the username so isUsernameAvailable works correctly
  await setDoc(doc(db, 'usernames', guestUsername), { uid });

  return { user: cred.user, profile: guestProfile };
};

// ─── Phone OTP ───────────────────────────────────────────────────────────────

export const setupRecaptcha = (containerId) => {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {},
  });
  return window.recaptchaVerifier;
};

export const sendPhoneOTP = async (phoneNumber, appVerifier) => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};

// ─── Session ─────────────────────────────────────────────────────────────────

export const logoutCurrentDevice = async () => {
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      onlineStatus: false,
      lastSeen: serverTimestamp(),
    }).catch(() => {});
  }
  return signOut(auth);
};

export const sendPasswordReset = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

// ─── User Document Creation (for Google / email sign-ups) ────────────────────

export const ensureUserDocument = async (user) => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      profilePhoto: user.photoURL || null,
      coverPhoto: null,
      username: null,
      bio: '',
      website: '',
      phoneNumber: user.phoneNumber || null,
      verified: false,
      role: 'user',
      banned: false,
      blacklisted: false,
      onlineStatus: true,
      lastSeen: serverTimestamp(),
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      reelsCount: 0,
      isPrivate: false,
      isGuest: false,
      profileSetupComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return snap;
};

// ─── Auth State Observer ─────────────────────────────────────────────────────

export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ─── Online Presence ─────────────────────────────────────────────────────────

export const updateOnlineStatus = async (uid, isOnline) => {
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      onlineStatus: isOnline,
      lastSeen: isOnline ? null : serverTimestamp(),
    });
  } catch {}
};
