// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDdE1fmFDX6qzUP9pHp5dzQrj0nxMuAMzA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "uchatsite.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "uchatsite",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "uchatsite.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "773339617535",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:773339617535:web:0651e635291ad8372e54ca",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-B3FCSYNL19",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// No Firebase Storage export — we use Cloudflare R2 now
export default app;
