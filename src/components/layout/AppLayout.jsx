// src/components/layout/AppLayout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import TopNav from './TopNav';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import IncomingCallHandler from '../calls/IncomingCallHandler';
import InstallBanner from '../pwa/InstallBanner';
import OfflineBanner from '../pwa/OfflineBanner';
import UpdateBanner from '../pwa/UpdateBanner';

export default function AppLayout() {
  const { pathname } = useLocation();
  const isFullScreen =
    pathname.startsWith('/reels') ||
    (pathname.startsWith('/messages/') && pathname.split('/').length > 2);

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
