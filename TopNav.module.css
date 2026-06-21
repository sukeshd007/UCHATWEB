// src/components/pwa/OfflineBanner.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const { isOnline } = usePWA();
  const [justCameBack, setJustCameBack] = useState(false);
  const [prevOnline, setPrevOnline] = useState(true);

  useEffect(() => {
    if (!prevOnline && isOnline) {
      setJustCameBack(true);
      setTimeout(() => setJustCameBack(false), 3000);
    }
    setPrevOnline(isOnline);
  }, [isOnline]);

  return (
    <AnimatePresence>
      {(!isOnline || justCameBack) && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            zIndex: 'var(--z-toast)',
            background: isOnline ? '#16a34a' : '#dc2626',
            color: 'white',
            padding: `calc(env(safe-area-inset-top) + 10px) 16px 10px`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {isOnline
            ? <><Wifi size={16} /> Back online</>
            : <><WifiOff size={16} /> No internet connection — browsing cached content</>
          }
        </motion.div>
      )}
    </AnimatePresence>
  );
}
