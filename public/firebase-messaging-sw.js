// public/firebase-messaging-sw.js
// Firebase requires this file at the root for background push notifications.
// This handles push messages when the app is in the background or closed.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Must match your src/firebase/config.js values
firebase.initializeApp({
  apiKey: "AIzaSyDdE1fmFDX6qzUP9pHp5dzQrj0nxMuAMzA",
  authDomain: "uchatsite.firebaseapp.com",
  projectId: "uchatsite",
  storageBucket: "uchatsite.firebasestorage.app",
  messagingSenderId: "773339617535",
  appId: "1:773339617535:web:0651e635291ad8372e54ca",
});

const messaging = firebase.messaging();

// Background message handler — shows notification when app is not focused
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'UChat', {
    body: body || 'You have a new notification',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: payload.data || {},
    vibrate: [100, 50, 100],
    tag: payload.data?.type || 'uchat-notif', // groups same-type notifications
  });
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
