// src/hooks/useNotifications.js
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications } from '../firebase/firestoreService';

export const useNotificationCount = () => {
  const { uid } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToNotifications(uid, setCount);
    return unsub;
  }, [uid]);

  return count;
};
