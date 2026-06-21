// src/firebase/messagingService.js
// Firebase Cloud Messaging — FREE on all Firebase plans
// Setup steps (one-time):
//   1. Firebase Console → Project Settings → Cloud Messaging
//   2. Under "Web Push certificates" click "Generate key pair"
//   3. Copy the key and put it in your .env as VITE_FIREBASE_VAPID_KEY=...
//   4. Deploy this app — push works automatically from then on

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { app, db, auth } from './config';

// Previously this ignored VITE_FIREBASE_VAPID_KEY entirely and always used a
// hardcoded fallback key — meaning anyone who set their own VAPID key in
// .env (as the setup instructions above tell them to) had it silently
// ignored, which can produce mismatched-key push failures.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BJcCHR1-vVvweRNDu8_QfXfstM0WX75-sDVkcT5Bw5WBt1OkeEu7QMGHL-mCp3Zj1VQ2ocxKncgZH1Y5IaCV0DE';

const R2_WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

let messagingInstance = null;

const getMessagingInstance = () => {
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};

// Call this after user logs in — saves their FCM token to Firestore
// so the Worker can target them with a real push, even fully offline/closed.
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
      // Save token to user's Firestore doc so the Worker can target them
      await updateDoc(doc(db, 'users', uid), {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp(),
        pushEnabled: true,
      });

      // Subscribe this device to the "all" topic via the Worker (so admin
      // broadcasts reach it). Previously this called the legacy IID API
      // directly from the browser using a VITE_FIREBASE_SERVER_KEY that was
      // never even set in .env — silently doing nothing. Routing it through
      // the Worker means it uses the same OAuth2-authenticated service
      // account as every other push call, and is verified via ID token so
      // random callers can't subscribe arbitrary tokens to your topics.
      if (R2_WORKER_URL && auth.currentUser) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          await fetch(`${R2_WORKER_URL}/subscribe-topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, token, topic: 'all' }),
          });
        } catch (e) {
          console.warn('Topic subscribe failed (broadcasts may not reach this device):', e.message);
        }
      }

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

// Sends a push to a specific user via the Cloudflare Worker's FCM HTTP v1
// endpoint. Looks up the recipient's saved FCM token first — if they don't
// have push enabled, this is a silent no-op (the in-app notification still
// gets written to Firestore by the caller regardless).
export const sendPushToUser = async (recipientProfile, { title, body, data } = {}) => {
  if (!R2_WORKER_URL) return; // Worker not configured — push silently unavailable
  if (!recipientProfile?.fcmToken || !recipientProfile?.pushEnabled) return;
  if (!auth.currentUser) return;
  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch(`${R2_WORKER_URL}/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, token: recipientProfile.fcmToken, title, body, data }),
    });
  } catch (e) {
    // Non-fatal — the in-app/Firestore notification already succeeded regardless
    console.warn('Push send failed:', e.message);
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
