// src/firebase/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, getDocs, serverTimestamp, updateDoc,
  collection, query, where, limit,
} from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use redirect on mobile (popups blocked on Android/iOS browsers), popup on desktop
const isMobile = () => /Android|iPhone|iPad|iPod|webOS|BlackBerry/i.test(navigator.userAgent);

// ─── Referral capture (invite-friends feature) ────────────────────────────────
// Call once on app boot. First-touch attribution: if a ref code is already
// stored, a later visit (e.g. without ?ref=) won't overwrite it.
const REFERRAL_KEY = 'uchat_referral_code';

export const captureReferralCode = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && !sessionStorage.getItem(REFERRAL_KEY)) {
      sessionStorage.setItem(REFERRAL_KEY, ref);
    }
  } catch {}
};

const consumeReferralCode = () => {
  try {
    const ref = sessionStorage.getItem(REFERRAL_KEY);
    sessionStorage.removeItem(REFERRAL_KEY);
    return ref;
  } catch {
    return null;
  }
};

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

const PROVIDER_LABELS = {
  password: 'email and password',
  'google.com': 'Google',
  'phone': 'phone number',
};

// Converts Firebase's auth/account-exists-with-different-credential into a
// clear, actionable message instead of leaving the user stuck on /auth with
// silent console-only feedback (which previously looked exactly like "login
// successful, but the app never moves past the auth screen").
const describeAccountExistsError = async (err) => {
  const email = err?.customData?.email;
  if (!email) return 'An account already exists with a different sign-in method.';
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    const labels = methods.map(m => PROVIDER_LABELS[m] || m);
    if (labels.length > 0) {
      return `You already have a UChat account using ${labels.join(' or ')} with this email. Please sign in that way instead.`;
    }
  } catch {}
  return 'An account already exists with a different sign-in method for this email.';
};

export const loginWithGoogle = async () => {
  if (isMobile()) {
    // Redirect flow — page reloads after Google auth, result picked up in AuthContext
    sessionStorage.setItem('googleRedirectPending', '1');
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserDocument(cred.user);
    return cred;
  } catch (err) {
    if (err?.code === 'auth/account-exists-with-different-credential') {
      const message = await describeAccountExistsError(err);
      const friendlyErr = new Error(message);
      friendlyErr.code = err.code;
      throw friendlyErr;
    }
    throw err;
  }
};

// Called once on app load — processes redirect result from Google on mobile
export const handleGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await ensureUserDocument(result.user);
      sessionStorage.removeItem('googleRedirectPending');
      return result;
    }
  } catch (err) {
    sessionStorage.removeItem('googleRedirectPending');
    const code = err?.code || '';
    if (code === 'auth/account-exists-with-different-credential') {
      const message = await describeAccountExistsError(err);
      const friendlyErr = new Error(message);
      friendlyErr.code = code;
      throw friendlyErr;
    }
    if (code !== 'auth/no-current-user' && code !== 'auth/null-user') throw err;
  }
  return null;
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
    const uid = auth.currentUser.uid;
    await updateDoc(doc(db, 'users', uid), {
      onlineStatus: false,
      lastSeen: serverTimestamp(),
      fcmToken: null,
      pushEnabled: false,
    }).catch(() => {});
  }
  return signOut(auth);
};

export const sendPasswordReset = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

// ─── User Document Creation (for Google / email sign-ups) ────────────────────

const OWNER_EMAILS_INTERNAL = ['support.uchat@gmail.com', 'help.uchat@outlook.com'];

export const ensureUserDocument = async (user) => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const isOwnerEmail = OWNER_EMAILS_INTERNAL.includes(user.email);
  if (!snap.exists()) {
    const referredBy = consumeReferralCode();
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
      verified: isOwnerEmail ? true : false,
      role: isOwnerEmail ? 'owner' : 'user',
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
      closeFriends: [],
      blockedUsers: [],
      inviteCount: 0,
      referredBy: referredBy || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (referredBy) {
      // Best-effort — a failed referral credit should never block account creation
      import('./firestoreService')
        .then(({ recordInviteSignup }) => recordInviteSignup(referredBy, user.uid))
        .catch(() => {});
    }
  } else {
    const data = snap.data();
    const repairs = {};
    // Repair: if user already has a username but profileSetupComplete is false
    if (data.username && !data.profileSetupComplete) {
      repairs.profileSetupComplete = true;
    }
    // Repair: ensure owner gets owner role
    if (isOwnerEmail && data.role !== 'owner') {
      repairs.role = 'owner';
      repairs.verified = true;
    }
    if (Object.keys(repairs).length > 0) {
      await updateDoc(ref, { ...repairs, updatedAt: serverTimestamp() });
    }
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
    // Previously this set `lastSeen: null` whenever isOnline was true, which made
    // it impossible to ever detect a "stuck online" ghost user (no mobile-reliable
    // disconnect event exists, so onlineStatus can get stuck true). Always writing
    // a real timestamp here lets isUserOnline() below treat anything older than a
    // threshold as offline, regardless of what the raw onlineStatus flag says.
    await updateDoc(doc(db, 'users', uid), {
      onlineStatus: isOnline,
      lastSeen: serverTimestamp(),
    });
  } catch {}
};

// Treats a user as online only if onlineStatus is true AND their lastSeen
// heartbeat is recent (within thresholdMs) AND they haven't opted out of
// showing activity status (Settings → Activity in Friends feed).
export const isUserOnline = (profile, thresholdMs = 90 * 1000) => {
  if (!profile?.onlineStatus) return false;
  if (profile.activityStatusVisible === false) return false;
  const lastSeen = profile.lastSeen?.toDate ? profile.lastSeen.toDate() : null;
  if (!lastSeen) return false;
  return (Date.now() - lastSeen.getTime()) < thresholdMs;
};
