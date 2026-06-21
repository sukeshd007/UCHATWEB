// src/components/layout/BottomNav.jsx
import { NavLink } from 'react-router-dom';
import { Home, Search, Play, MessageCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationCount } from '../../hooks/useNotifications';

const NAV_ITEMS = [
  { to: '/',         icon: Home,          label: 'Home',     exact: true },
  { to: '/search',   icon: Search,        label: 'Search' },
  { to: '/reels',    icon: Play,          label: 'Reels' },
  { to: '/messages', icon: MessageCircle, label: 'Chats' },
  { to: '/profile',  icon: User,          label: 'Me' },
];

export default function BottomNav() {
  const { userProfile } = useAuth();
  const unreadCount = useNotificationCount();

  return (
    <nav style={{
      display: 'flex', alignItems: 'stretch',
      height: '100%',
      background: 'var(--nav-bg)',
      borderTop: '1px solid var(--nav-border)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to === '/profile' ? `/profile/${userProfile?.username}` : to}
          end={exact}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, paddingTop: 8,
            color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
            textDecoration: 'none',
            position: 'relative',
            transition: 'color var(--dur-fast)',
            WebkitTapHighlightColor: 'transparent',
          })}
        >
          {({ isActive }) => (
            <>
              {/* Active pill background */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  style={{
                    position: 'absolute', top: 6,
                    width: 52, height: 30,
                    background: 'rgba(124,58,237,0.12)',
                    borderRadius: 'var(--r-full)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}

              {/* Icon with notification badge */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.9}
                  style={{ transition: 'stroke-width var(--dur-fast)' }}
                />
                {/* Badge on Messages */}
                <AnimatePresence>
                  {label === 'Chats' && unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                      style={{
                        position: 'absolute', top: -5, right: -7,
                        minWidth: 16, height: 16, padding: '0 4px',
                        background: 'var(--error-color)', color: 'white',
                        borderRadius: 'var(--r-full)', fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--bg-primary)',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, zIndex: 1 }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
