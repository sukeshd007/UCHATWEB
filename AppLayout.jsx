// src/components/pwa/UpdateBanner.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export default function UpdateBanner() {
  const { updateAvailable, applyUpdate } = usePWA();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          style={{
            position: 'fixed',
            top: 'calc(8px + env(safe-area-inset-top))',
            left: 12, right: 12,
            zIndex: 'var(--z-toast)',
            background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
            borderRadius: 16,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            color: 'white',
            maxWidth: 420,
            margin: '0 auto',
          }}
        >
          <Sparkles size={18} style={{ flexShrink: 0 }} />
          <p style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
            New version of UChat is available!
          </p>
          <button
            onClick={applyUpdate}
            style={{
              padding: '6px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
              flexShrink: 0,
            }}
          >
            <RefreshCw size={13} /> Update
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
