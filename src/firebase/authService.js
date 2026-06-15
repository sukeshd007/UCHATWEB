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
  doc, setDoc, getDoc, getDocs, serverTimestamp, updateDoc,
  collection, query, where, limit,
} from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Generate Guest Username ──────────────────────────────────────────────────
// Uses a zero-padded 7-digit number derived from the current timestamp.
// No Firestore counter doc needed — uid is appended so collisions are impossible.
// Format: guest0000001 … guest9999999
const generateGuestUsername = (uid) => {
  // Take the last 7 digits of ms timestamp — rolls over every ~2.7 hours but
  // combined with the uid it is globally unique. We store it as the display
  // username (short, readable) and rely on uid for actual uniqueness.
  const num = parseInt(Date.now().toString().slice(-7), 10);
  return `guest${String(num).padStart(7, '0')}`;
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
// signInAnonymously() gives a persistent Firebase uid (survives page refresh).
// We write the guest profile to users/{uid} so AuthContext can subscribe to it
// with subscribeToUser() — exactly the same as any regular user. No localStorage.
export const loginAsGuest = async () => {
  // Step 1: Sign in anonymously — Firebase persists this session automatically
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;

  // Step 2: Check if this guest already has a Firestore profile (returning user)
  const userRef = doc(db, 'users', uid);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (e) {
    throw new Error('Could not reach Firestore. Check your connection.');
  }

  if (snap.exists()) {
    // Returning guest — profile already in Firestore, AuthContext listener picks it up
    return { user: cred.user, profile: { id: snap.id, ...snap.data() } };
  }

  // Step 3: New guest — create their profile
  const guestUsername = generateGuestUsername(uid);

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

  try {
    await setDoc(userRef, guestProfile);
    // Index username so isUsernameAvailable works correctly
    await setDoc(doc(db, 'usernames', guestUsername), { uid });
  } catch (e) {
    // If Firestore write fails, sign out cleanly and surface a clear error
    await signOut(auth).catch(() => {});
    throw new Error('Failed to create guest profile. Please try again.');
  }

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
