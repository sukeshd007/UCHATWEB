// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToAuthState, ensureUserDocument, updateOnlineStatus, handleGoogleRedirectResult } from '../firebase/authService';
import { subscribeToUser } from '../firebase/firestoreService';
import { initPushNotifications, onForegroundMessage, disablePush } from '../firebase/messagingService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const OWNER_EMAILS = ['support.uchat@gmail.com', 'help.uchat@outlook.com'];
export const OWNER_USERNAMES = ['sukesh._.official'];

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribeProfile, setUnsubscribeProfile] = useState(null);

  useEffect(() => {
    // Handle Google redirect result on mobile (runs once on page load)
    handleGoogleRedirectResult().catch(err => {
      console.error('Google redirect error:', err?.message);
    });

    const unsubAuth = subscribeToAuthState(async (user) => {
      setFirebaseUser(user);

      // Tear down previous Firestore listener
      if (unsubscribeProfile) unsubscribeProfile();

      if (user) {
        // Both regular AND anonymous (guest) users have a Firestore doc under
        // users/{uid}, so we can use the exact same subscribeToUser path for both.
        // No localStorage, no polling — Firestore real-time listener handles it.
        if (!user.isAnonymous) {
          await ensureUserDocument(user);
          await updateOnlineStatus(user.uid, true);
        }

        const unsub = subscribeToUser(user.uid, (profile) => {
          setUserProfile(profile);
          setLoading(false);
        });
        setUnsubscribeProfile(() => unsub);

        // Init push notifications (non-blocking, silent fail if VAPID not set)
        if (!user.isAnonymous) {
          initPushNotifications(user.uid).catch(() => {});
          // Show in-app toast for foreground messages
          onForegroundMessage((payload) => {
            const { title, body } = payload.notification || {};
            if (title || body) toast(body || title, { icon: '🔔', duration: 4000 });
          });
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    const handleVisibility = () => {
      if (firebaseUser?.uid && !firebaseUser.isAnonymous) {
        updateOnlineStatus(firebaseUser.uid, !document.hidden);
      }
    };
    const handleUnload = () => {
      if (firebaseUser?.uid && !firebaseUser.isAnonymous) {
        updateOnlineStatus(firebaseUser.uid, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      unsubAuth();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const isOwner = OWNER_EMAILS.includes(userProfile?.email) || OWNER_USERNAMES.includes(userProfile?.username);
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
