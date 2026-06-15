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
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Generate Guest ID ────────────────────────────────────────────────────────
const generateGuestId = async () => {
  // Try to find a unique guest ID
  for (let attempt = 0; attempt < 20; attempt++) {
    const num = Math.floor(Math.random() * 9999999) + 1;
    const padded = String(num).padStart(7, '0');
    const guestUsername = `guest${padded}`;
    const q = query(collection(db, 'users'), where('username', '==', guestUsername));
    const snap = await getDocs(q);
    if (snap.empty) return guestUsername;
  }
  // Fallback
  return `guest${Date.now().toString().slice(-7)}`;
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

// ─── Guest (Website-native, no Firebase Anonymous) ───────────────────────────
export const loginAsGuest = async () => {
  // Check if existing guest session
  const existing = localStorage.getItem('uchat_guest_profile');
  if (existing) {
    const profile = JSON.parse(existing);
    // Sign in anonymously to Firebase just for session tracking
    const cred = await signInAnonymously(auth);
    // Store guest profile in localStorage - nickname is locked
    localStorage.setItem('uchat_guest_uid', cred.user.uid);
    return { user: cred.user, profile };
  }

  const cred = await signInAnonymously(auth);
  const guestUsername = await generateGuestId();

  const guestProfile = {
    uid: cred.user.uid,
    username: guestUsername,
    displayName: guestUsername,
    profilePhoto: null,
    bio: '',
    role: 'user',
    verified: false,
    isGuest: true,
    profileSetupComplete: true,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: new Date().toISOString(),
    nicknameSet: false, // guests cannot change username
  };

  // Save to Firestore so others can find/follow the guest
  await setDoc(doc(db, 'users', cred.user.uid), {
    ...guestProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    onlineStatus: true,
    lastSeen: serverTimestamp(),
    isPrivate: false,
    banned: false,
    blacklisted: false,
    reelsCount: 0,
    coverPhoto: null,
    website: '',
    phoneNumber: null,
    email: null,
  });

  // Also save username index
  await setDoc(doc(db, 'usernames', guestUsername), { uid: cred.user.uid });

  localStorage.setItem('uchat_guest_profile', JSON.stringify(guestProfile));
  localStorage.setItem('uchat_guest_uid', cred.user.uid);

  return { user: cred.user, profile: guestProfile };
};

// ─── Phone OTP ───────────────────────────────────────────────────────────────

export const setupRecaptcha = (containerId) => {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {}
  });
  return window.recaptchaVerifier;
};

export const sendPhoneOTP = async (phoneNumber, appVerifier) => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};

// ─── Session ─────────────────────────────────────────────────────────────────

export const logoutCurrentDevice = async () => {
  if (auth.currentUser) {
    const isAnon = auth.currentUser.isAnonymous;
    if (!isAnon) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        onlineStatus: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }
    // Keep guest profile in localStorage so they can return as same guest
  }
  return signOut(auth);
};

export const sendPasswordReset = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

// ─── User Document Creation ───────────────────────────────────────────────────

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
      updatedAt: serverTimestamp()
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
      lastSeen: isOnline ? null : serverTimestamp()
    });
  } catch (e) {}
};
