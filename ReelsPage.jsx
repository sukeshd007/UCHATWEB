// src/pages/SettingsPage.jsx
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserCog, Bookmark, Clock, Lock, Eye, Activity, UserPlus,
  Ban, Download, Database, Shield, BarChart3, BadgeCheck, Moon, Sun,
  KeyRound, HelpCircle, ShieldCheck, ScrollText, Info, LogOut, ChevronRight, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logoutCurrentDevice } from '../firebase/authService';
import { MenuTile, Toggle } from '../components/settings/SettingsUI';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { userProfile, isGuest, isOwner, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutCurrentDevice();
    navigate('/auth');
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 100px', minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px'
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Settings</h1>
      </div>

      {/* Profile card */}
      {userProfile && (
        <div
          onClick={() => navigate(`/profile/${userProfile.username}`)}
          style={{
            margin: 16, padding: 16, borderRadius: 16, cursor: 'pointer',
            background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 14
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {userProfile.profilePhoto
              ? <img src={userProfile.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>{(userProfile.displayName || '?')[0].toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              {userProfile.displayName || userProfile.username}
              {userProfile.verified && <VerifiedBadge size={16} />}
              {isGuest && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>GUEST</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>@{userProfile.username}</div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        <MenuTile icon={<UserCog size={18} />} iconBg="#4B5563" title="Accounts Center"
          subtitle="Password, security, personal details, ad preferences"
          onClick={() => navigate('/settings/accounts-center')} />

        <MenuTile icon={<Bookmark size={18} />} iconBg="#7C3AED" title="Saved reels"
          onClick={() => navigate('/settings/saved-reels')} />

        <MenuTile icon={<Clock size={18} />} iconBg="#0891B2" title="Time management"
          subtitle="Time limits"
          onClick={() => navigate('/settings/time-management')} />

        <MenuTile icon={<Lock size={18} />} iconBg="#2563EB" title="Account privacy"
          subtitle={userProfile?.isPrivate ? 'Private' : 'Public'}
          onClick={() => navigate('/settings/privacy')} />

        <MenuTile icon={<Eye size={18} />} iconBg="#DB2777" title="Story, live and location"
          subtitle="Who can view your story, live and location"
          onClick={() => navigate('/settings/story-privacy')} />

        <MenuTile icon={<Activity size={18} />} iconBg="#16A34A" title="Activity in Friends feed"
          subtitle="Show activity status"
          onClick={() => navigate('/settings/activity-status')} />

        <MenuTile icon={<UserPlus size={18} />} iconBg="#EA580C" title="Follow and invite friends"
          subtitle="50 invites = free verified badge for 7 days"
          onClick={() => navigate('/settings/invite-friends')} />

        <MenuTile icon={<Ban size={18} />} iconBg="#DC2626" title="Blocked accounts"
          onClick={() => navigate('/settings/blocked')} />

        <MenuTile icon={<Download size={18} />} iconBg="#0D9488" title="Archiving and downloading"
          onClick={() => navigate('/settings/archiving-downloads')} />

        <MenuTile icon={<Database size={18} />} iconBg="#65A30D" title="Data usage and media quality"
          onClick={() => navigate('/settings/data-usage')} />

        <MenuTile icon={<Shield size={18} />} iconBg="#10B981" title="App and website permissions"
          onClick={() => navigate('/settings/permissions')} />

        <MenuTile icon={<BarChart3 size={18} />} iconBg="#7C3AED" title="Account type and tools"
          subtitle="Analytics, trial reel, monetization, ads"
          onClick={() => navigate('/settings/account-tools')} />

        <MenuTile icon={<BadgeCheck size={18} />} iconBg="#0EA5E9" title="UChat Verified"
          subtitle={userProfile?.verified ? 'You are verified' : '\u20b9299/month \u2014 Not subscribed'}
          badge={userProfile?.verified ? '\u2713' : null}
          onClick={() => navigate('/settings/verified')} />

        {/* Appearance — simple enough to stay a single inline toggle */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Dark Mode</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{theme === 'dark' ? 'Currently dark' : 'Currently light'}</div>
          </div>
          <Toggle value={theme === 'dark'} onChange={toggleTheme} />
        </div>

        <MenuTile icon={<KeyRound size={18} />} iconBg="#059669" title="Account & Security"
          subtitle="Password, two-factor authentication"
          onClick={() => navigate('/settings/security')} />

        <div style={{ height: 4 }} />

        <MenuTile icon={<HelpCircle size={18} />} iconBg="#EF4444" title="Support"
          onClick={() => navigate('/settings/support')} />

        <MenuTile icon={<ShieldCheck size={18} />} iconBg={userProfile?.banned ? '#DC2626' : '#10B981'} title="Account Status"
          subtitle={userProfile?.banned ? 'Banned' : (userProfile?.verified ? 'Verified' : 'Active')}
          onClick={() => navigate('/settings/account-status')} />

        <MenuTile icon={<ScrollText size={18} />} iconBg="#6B7280" title="Privacy & Community Guidelines"
          onClick={() => navigate('/settings/guidelines')} />

        <MenuTile icon={<Info size={18} />} iconBg="#6B7280" title="About UChat"
          onClick={() => navigate('/settings/about')} />

        {/* Admin / Owner Panel */}
        {isAdmin && (
          <MenuTile icon={<Star size={18} />} iconBg="#F59E0B" title={isOwner ? '\ud83d\udc51 Owner Panel' : '\ud83d\udee1 Admin Panel'}
            onClick={() => navigate('/admin')} />
        )}

        <div style={{ height: 8 }} />

        {/* Login / Add account / Log out */}
        <button
          onClick={() => toast('You\u2019re already logged in. Log out first to switch accounts.')}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-primary)'
          }}
        >
          <UserPlus size={18} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Add Account</span>
        </button>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', gap: 12, color: '#EF4444'
          }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Log Out</span>
        </button>

        {isGuest && (
          <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Guest Mode:</strong> Your ID (<strong>{userProfile?.username}</strong>) is permanent. Sign up to access all features and keep your account.
          </div>
        )}
      </div>
    </div>
  );
}
