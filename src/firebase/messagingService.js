// src/firebase/messagingService.js
// Firebase Cloud Messaging — FREE on all Firebase plans
// Setup steps (one-time):
//   1. Firebase Console → Project Settings → Cloud Messaging
//   2. Under "Web Push certificates" click "Generate key pair"
//   3. Copy the key and put it in your .env as VITE_FIREBASE_VAPID_KEY=...
//   4. Deploy this app — push works automatically from then on

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BGi53Xg7Q9I5Z3J16QxXfoZ5S_aZuw9A05leGo9C_tgMR8jsGpm-PvhyJaolq4upHJL4GJ6UPaiOGA7h2BQyVOw';

let messagingInstance = null;

const getMessagingInstance = () => {
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};

// Call this after user logs in — saves their FCM token to Firestore
// so the Cloud Function (or server) can send them push notifications
export const initPushNotifications = async (uid) => {
  if (!uid || !VAPID_KEY) {
    if (!VAPID_KEY) {
      console.warn(
        'Push notifications disabled: set VITE_FIREBASE_VAPID_KEY in your .env\n' +
        'Get it from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair'
      );
    }
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied by user');
      return null;
    }

    const messaging = getMessagingInstance();
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      // Save token to user's Firestore doc so backend can target them
      await updateDoc(doc(db, 'users', uid), {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp(),
        pushEnabled: true,
      });

      // Subscribe token to /topics/all so admin broadcasts reach everyone
      // This uses the FCM topic management API (free, no server needed)
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'uchatsite';
      try {
        await fetch(`https://iid.googleapis.com/iid/v1/${token}/rel/topics/all`, {
          method: 'POST',
          headers: {
            Authorization: `key=${import.meta.env.VITE_FIREBASE_SERVER_KEY || ''}`,
            'Content-Type': 'application/json',
          },
        });
      } catch {} // Non-critical — broadcast may not reach this device but app still works

      console.log('FCM token saved ✓');
    }

    return token;
  } catch (err) {
    // Common causes:
    // - Service worker not registered yet (wait for page load)
    // - User is in incognito (push not supported)
    // - VAPID key wrong
    console.warn('FCM init failed:', err.message);
    return null;
  }
};

// Listen for foreground messages (app is open) and show a toast
// Returns unsubscribe function
export const onForegroundMessage = (callback) => {
  try {
    const messaging = getMessagingInstance();
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch {
    return () => {};
  }
};

// Disable push for this device (e.g. on logout)
export const disablePush = async (uid) => {
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      fcmToken: null,
      pushEnabled: false,
    });
  } catch {}
};
