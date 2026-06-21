// src/hooks/usePWA.js
import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // ── Register Service Worker ──────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
          setSwRegistration(reg);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((err) => console.warn('[PWA] SW registration failed:', err));

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    // ── Install Prompt (Android / Desktop Chrome) ────────────────────────────
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // ── Detect already installed ─────────────────────────────────────────────
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };
    checkInstalled();
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    // ── Online / Offline ─────────────────────────────────────────────────────
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
    return outcome === 'accepted';
  };

  const applyUpdate = () => {
    swRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return {
    installPrompt,
    isInstalled,
    isOnline,
    updateAvailable,
    promptInstall,
    applyUpdate,
    canInstall: !!installPrompt && !isInstalled,
  };
};
