// src/components/pwa/InstallBanner.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);

export default function InstallBanner() {
  const { canInstall, promptInstall, isInstalled } = usePWA();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('uchat-install-dismissed') === 'true';
  });
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isInstalled || dismissed) return;
    // Delay banner by 3s so it doesn't block first impression
    const timer = setTimeout(() => {
      if (canInstall || isIOS()) setShowBanner(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, dismissed]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('uchat-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) setShowBanner(false);
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{
              position: 'fixed',
              bottom: 'calc(68px + env(safe-area-inset-bottom))',
              left: 12, right: 12,
              zIndex: 'var(--z-toast)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 20,
              padding: '14px 16px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            {/* App icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: 'white',
              fontFamily: 'var(--font-display)',
            }}>U</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                Install UChat App
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isIOS()
                  ? 'Add to Home Screen for the best experience'
                  : 'Fast, works offline, feels native'}
              </p>
            </div>

            <button
              onClick={handleInstall}
              style={{
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
                color: 'white', borderRadius: 10,
                fontSize: 13, fontWeight: 700, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {isIOS() ? <Share size={14} /> : <Download size={14} />}
              {isIOS() ? 'Share' : 'Install'}
            </button>

            <button
              onClick={handleDismiss}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--surface-3)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)',
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Guide */}
      <AnimatePresence>
        {showIOSGuide && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowIOSGuide(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 'var(--z-modal)', backdropFilter: 'blur(6px)' }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                zIndex: 'calc(var(--z-modal) + 1)',
                background: 'var(--bg-secondary)',
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                padding: '20px 24px calc(32px + env(safe-area-inset-bottom))',
                boxShadow: 'var(--modal-shadow)',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 20px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Add UChat to Home Screen</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                Install UChat like an app for the best mobile experience — no App Store needed!
              </p>
              {[
                { step: '1', icon: '⬆️', text: 'Tap the Share button at the bottom of Safari' },
                { step: '2', icon: '➕', text: 'Scroll down and tap "Add to Home Screen"' },
                { step: '3', icon: '✅', text: 'Tap "Add" — UChat will appear on your home screen!' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0,
                  }}>{item.step}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 5 }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <p style={{ fontSize: 14, lineHeight: 1.5 }}>{item.text}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setShowIOSGuide(false); handleDismiss(); }}
                style={{
                  width: '100%', padding: 14, borderRadius: 14,
                  background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
                  color: 'white', fontSize: 15, fontWeight: 700,
                }}
              >
                Got it!
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
