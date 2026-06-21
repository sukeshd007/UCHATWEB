// src/components/layout/AppLayout.jsx
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import TopNav from './TopNav';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import IncomingCallHandler from '../calls/IncomingCallHandler';
import InstallBanner from '../pwa/InstallBanner';
import OfflineBanner from '../pwa/OfflineBanner';
import UpdateBanner from '../pwa/UpdateBanner';
import { recordHeartbeat, shouldShowLimitReminder } from '../../utils/timeTracking';

const TIME_HEARTBEAT_SECONDS = 30;

export default function AppLayout() {
  const { pathname } = useLocation();
  const isFullScreen =
    pathname.startsWith('/reels') ||
    (pathname.startsWith('/messages/') && pathname.split('/').length > 2);

  // Time Limits — lightweight per-device usage tracker (see Settings ›
  // Time management). Only counts time while the tab is actually visible.
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      recordHeartbeat(TIME_HEARTBEAT_SECONDS);
      if (shouldShowLimitReminder()) {
        toast('You\u2019ve reached your daily time limit on UChat \ud83d\udd5d', { duration: 6000, icon: '\u23f1\ufe0f' });
      }
    };
    const interval = setInterval(tick, TIME_HEARTBEAT_SECONDS * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      {/* PWA helpers */}
      <OfflineBanner />
      <UpdateBanner />

      {/* Top nav — always visible except fullscreen */}
      {!isFullScreen && (
        <div className="top-nav-slot">
          <TopNav />
        </div>
      )}

      {/* Sidebar — tablet & desktop only */}
      {!isFullScreen && (
        <div className="side-nav-slot">
          <SideNav />
        </div>
      )}

      {/* Main content */}
      <main className={`main-content${isFullScreen ? ' fullscreen' : ''}`}>
        <Outlet />
      </main>

      {/* Bottom nav — mobile only */}
      {!isFullScreen && (
        <div className="bottom-nav-slot">
          <BottomNav />
        </div>
      )}

      {/* Global overlays */}
      <IncomingCallHandler />
      <InstallBanner />
    </div>
  );
}
