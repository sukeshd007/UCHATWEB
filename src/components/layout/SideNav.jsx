// src/components/layout/SideNav.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Play, MessageCircle, User, Shield, LogOut, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { logoutCurrentDevice } from '../../firebase/authService';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/',          icon: Home,          label: 'Home',     exact: true },
  { to: '/search',    icon: Search,        label: 'Search' },
  { to: '/reels',     icon: Play,          label: 'Reels' },
  { to: '/messages',  icon: MessageCircle, label: 'Messages' },
  { to: '/profile',   icon: User,          label: 'Profile' },
];

export default function SideNav() {
  const { userProfile, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutCurrentDevice();
      navigate('/auth');
      toast.success('Signed out');
    } catch {
      toast.error('Sign out failed');
    }
  };

  // On tablet: icon-only (68px); on desktop: icon + label (240px)
  return (
    <nav style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-subtle)',
      padding: '8px 8px 16px',
      paddingTop: 'calc(8px + env(safe-area-inset-top))',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Logo at top of sidebar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 8px 16px', marginBottom: 4,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, color: 'white',
          fontFamily: 'var(--font-display)',
        }}>U</div>
        <span className="sidebar-label" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20, fontWeight: 800,
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          whiteSpace: 'nowrap', overflow: 'hidden',
        }}>UChat</span>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to === '/profile' ? `/profile/${userProfile?.username}` : to}
            end={exact}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px',
              borderRadius: 'var(--r-md)',
              textDecoration: 'none',
              color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(124,58,237,0.09)' : 'transparent',
              fontWeight: isActive ? 700 : 500,
              transition: 'all var(--dur-fast)',
              position: 'relative',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active-link')) e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = e.currentTarget.style.background }}
          >
            {({ isActive }) => (
              <>
                <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.9} />
                </div>
                <span className="sidebar-label" style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 2, background: 'var(--brand-primary)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin/Owner link */}
        {(isAdmin || isOwner) && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px',
              borderRadius: 'var(--r-md)',
              textDecoration: 'none',
              color: isActive ? '#f59e0b' : '#f59e0b',
              background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
              fontWeight: 600, marginTop: 8,
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 16,
              transition: 'background var(--dur-fast)',
            })}
          >
            {() => (
              <>
                <Shield size={22} strokeWidth={1.9} style={{ flexShrink: 0 }} />
                <span className="sidebar-label" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>
                  {isOwner ? 'Owner Panel' : 'Admin Panel'}
                </span>
              </>
            )}
          </NavLink>
        )}
      </div>

      {/* User footer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 8px',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-1)',
        cursor: 'pointer',
      }}>
        <Avatar src={userProfile?.profilePhoto} name={userProfile?.displayName} size={34} verified={userProfile?.verified} />
        <div className="sidebar-label" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <p style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userProfile?.displayName}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            @{userProfile?.username}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{ color: 'var(--text-tertiary)', padding: 4, borderRadius: 6, transition: 'color var(--dur-fast)', flexShrink: 0 }}
          title="Sign out"
          onMouseEnter={e => e.currentTarget.style.color = 'var(--error-color)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* CSS: hide labels on tablet (sidebar collapsed), show on desktop */}
      <style>{`
        @media (max-width: 1023px) { .sidebar-label { display: none !important } }
        @media (min-width: 1024px) { .sidebar-label { display: block !important } }
      `}</style>
    </nav>
  );
}
