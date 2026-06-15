// src/components/layout/TopNav.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, Sun, Moon, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotificationCount } from '../../hooks/useNotifications';
import CreatePostModal from '../posts/CreatePostModal';
import Avatar from '../common/Avatar';

export default function TopNav() {
  const { userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const unreadCount = useNotificationCount();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <nav style={{
        height: 'var(--nav-h-top)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        gap: 8,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--brand-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: 'white',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
          }}>U</div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20, fontWeight: 800,
            background: 'var(--brand-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>UChat</span>
        </Link>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Theme toggle */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun size={20} strokeWidth={1.8} />
              : <Moon size={20} strokeWidth={1.8} />}
          </button>

          {/* Create */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px',
              background: 'var(--brand-gradient)',
              color: 'white', borderRadius: 'var(--r-full)',
              fontSize: 13, fontWeight: 700,
              boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
              transition: 'opacity var(--dur-fast), transform var(--dur-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hide-xs">Create</span>
          </button>

          {/* Notifications */}
          <Link to="/notifications" className="icon-btn" style={{ position: 'relative' }} aria-label="Notifications">
            <Bell size={20} strokeWidth={1.8} />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  className="badge"
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 16, height: 16,
                    border: '2px solid var(--bg-primary)',
                    fontSize: 9,
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* Avatar */}
          <Link
            to={`/profile/${userProfile?.username}`}
            style={{ borderRadius: '50%', display: 'flex', transition: 'opacity var(--dur-fast)' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Avatar
              src={userProfile?.profilePhoto}
              name={userProfile?.displayName}
              size={32}
              verified={userProfile?.verified}
            />
          </Link>
        </div>
      </nav>

      <AnimatePresence>
        {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      <style>{`
        @media (max-width: 380px) { .hide-xs { display: none } }
      `}</style>
    </>
  );
}
