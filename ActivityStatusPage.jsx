// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { subscribeToAuthState, ensureUserDocument, updateOnlineStatus, handleGoogleRedirectResult, captureReferralCode } from '../firebase/authService';
import { subscribeToUser } from '../firebase/firestoreService';
import { initPushNotifications, onForegroundMessage, disablePush } from '../firebase/messagingService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const OWNER_EMAILS = ['support.uchat@gmail.com', 'help.uchat@outlook.com'];
export const OWNER_USERNAMES = ['sukesh._.official'];

const HEARTBEAT_MS = 45 * 1000; // keep lastSeen fresh every 45s while tab is visible

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs instead of state for things read inside event-listener closures and
  // the unsubscribe-on-auth-change cleanup. Previously these were plain state
  // variables captured by a useEffect with `[]` deps — every closure (the
  // onAuthStateChanged callback, handleVisibility, handleUnload) only ever saw
  // the *initial* value (null), so old Firestore profile listeners were never
  // torn down, and visibility/unload handlers never actually fired
  // updateOnlineStatus because they always read firebaseUser as null.
  const unsubscribeProfileRef = useRef(null);
  const currentUserRef = useRef(null); // { uid, isAnonymous } | null
  const heartbeatRef = useRef(null);

  useEffect(() => {
    // Capture ?ref=username before anything else, so it survives the
    // Google-redirect round-trip (which reloads the page and would otherwise
    // drop the query param).
    captureReferralCode();

    // Handle Google redirect result on mobile (runs once on page load)
    handleGoogleRedirectResult().catch(err => {
      console.error('Google redirect error:', err?.message);
      if (err?.code === 'auth/account-exists-with-different-credential') {
        toast.error(err.message, { duration: 6000 });
      }
    });

    const unsubAuth = subscribeToAuthState(async (user) => {
      setFirebaseUser(user);
      currentUserRef.current = user ? { uid: user.uid, isAnonymous: user.isAnonymous } : null;

      // Tear down previous Firestore listener (now reads the latest ref, not a stale closure)
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      if (user) {
        try {
          // Both regular AND anonymous (guest) users have a Firestore doc under
          // users/{uid}, so we can use the exact same subscribeToUser path for both.
          // No localStorage, no polling — Firestore real-time listener handles it.
          if (!user.isAnonymous) {
            await ensureUserDocument(user);
            await updateOnlineStatus(user.uid, true);
          }

          const unsub = subscribeToUser(user.uid, (profile) => {
            setUserProfile(prev => {
              // Show "you are verified!" toast when verified status just turned on
              if (profile.verified && prev && !prev.verified) {
                toast.success('🎉 You are successfully verified!', { duration: 5000, icon: '✅' });
              }
              return profile;
            });
            setLoading(false);
          });
          unsubscribeProfileRef.current = unsub;

          // Init push notifications (non-blocking, silent fail if VAPID not set)
          if (!user.isAnonymous) {
            initPushNotifications(user.uid).catch(() => {});
            // Show in-app toast for foreground messages
            onForegroundMessage((payload) => {
              const { title, body } = payload.notification || {};
              if (title || body) toast(body || title, { icon: '🔔', duration: 4000 });
            });
            // Heartbeat: refresh lastSeen periodically while the tab stays open,
            // so isUserOnline() can detect staleness if the tab dies without
            // ever firing beforeunload (very common on mobile).
            heartbeatRef.current = setInterval(() => {
              if (!document.hidden) updateOnlineStatus(user.uid, true);
            }, HEARTBEAT_MS);
          }
        } catch (err) {
          // Previously an uncaught error here (e.g. a Firestore security-rule
          // rejection on doc-create) meant setLoading(false) was never reached,
          // so the app stayed on the loading screen forever even after a fully
          // successful sign-in — this is what "login successful but never
          // goes to the site" looked like.
          console.error('Auth state setup error:', err?.message || err);
          toast.error('Something went wrong signing you in. Please try again.');
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    const handleVisibility = () => {
      const u = currentUserRef.current;
      if (u?.uid && !u.isAnonymous) {
        updateOnlineStatus(u.uid, !document.hidden);
      }
    };
    const handleUnload = () => {
      const u = currentUserRef.current;
      if (u?.uid && !u.isAnonymous) {
        updateOnlineStatus(u.uid, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      unsubAuth();
      if (unsubscribeProfileRef.current) unsubscribeProfileRef.current();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Owner check: matches email in profile, firebase auth email, or username
  const isOwner = 
    OWNER_EMAILS.includes(userProfile?.email) || 
    OWNER_EMAILS.includes(firebaseUser?.email) ||
    OWNER_USERNAMES.includes(userProfile?.username);
  const isAdmin = userProfile?.role === 'admin' || isOwner;
  const isProfileComplete = userProfile?.profileSetupComplete === true;
  const banUntil = userProfile?.banUntil;
  const banExpired = banUntil && banUntil !== 'permanent' && new Date(banUntil) < new Date();
  const isBanned = userProfile?.banned === true && !banExpired;
  const isGuest = firebaseUser?.isAnonymous || false;

  const value = {
    firebaseUser,
    userProfile,
    loading,
    isOwner,
    isAdmin,
    isProfileComplete,
    isBanned,
    uid: firebaseUser?.uid || null,
    isGuest,
    isAuthenticated: !!firebaseUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
