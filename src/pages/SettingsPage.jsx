// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, Lock, Shield, Eye, UserCheck, HelpCircle,
  MessageSquare, Moon, Sun, Smartphone, Globe, Trash2,
  LogOut, ChevronRight, CheckCircle, Toggle, Info, Star,
  Volume2, VolumeX, Mail, Phone, Download, Heart, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logoutCurrentDevice } from '../firebase/authService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { userProfile, uid, isGuest, isOwner, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Notification preferences
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifStories, setNotifStories] = useState(false);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSound, setNotifSound] = useState(true);

  // Privacy
  const [privateAccount, setPrivateAccount] = useState(userProfile?.isPrivate || false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowDMs, setAllowDMs] = useState(true);

  const [activeSection, setActiveSection] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('feedback');

  // Permissions
  const [micPermission, setMicPermission] = useState('prompt');
  const [camPermission, setCamPermission] = useState('prompt');
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  useEffect(() => {
    // Check current permission states
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then(r => setMicPermission(r.state)).catch(() => {});
      navigator.permissions.query({ name: 'camera' }).then(r => setCamPermission(r.state)).catch(() => {});
    }
  }, []);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermission('granted');
      toast.success('Microphone access granted');
    } catch { setMicPermission('denied'); toast.error('Microphone permission denied'); }
  };

  const requestCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCamPermission('granted');
      toast.success('Camera access granted');
    } catch { setCamPermission('denied'); toast.error('Camera permission denied'); }
  };

  const requestNotif = async () => {
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') toast.success('Notifications enabled');
    else toast.error('Notification permission denied');
  };

  // Load saved prefs
  useEffect(() => {
    const saved = localStorage.getItem('uchat_notif_prefs');
    if (saved) {
      const p = JSON.parse(saved);
      setNotifMessages(p.messages ?? true);
      setNotifLikes(p.likes ?? true);
      setNotifFollows(p.follows ?? true);
      setNotifComments(p.comments ?? true);
      setNotifStories(p.stories ?? false);
      setNotifEmail(p.email ?? false);
      setNotifPush(p.push ?? true);
      setNotifSound(p.sound ?? true);
    }
    if (userProfile) {
      setPrivateAccount(userProfile.isPrivate || false);
    }
  }, [userProfile]);

  const saveNotifPrefs = (key, val) => {
    const saved = JSON.parse(localStorage.getItem('uchat_notif_prefs') || '{}');
    saved[key] = val;
    localStorage.setItem('uchat_notif_prefs', JSON.stringify(saved));
  };

  const togglePrivate = async () => {
    if (isGuest) { toast('Guests cannot change privacy settings'); return; }
    const newVal = !privateAccount;
    setPrivateAccount(newVal);
    try {
      await updateDoc(doc(db, 'users', uid), { isPrivate: newVal, updatedAt: serverTimestamp() });
      toast.success(newVal ? 'Account is now private' : 'Account is now public');
    } catch { setPrivateAccount(!newVal); toast.error('Failed to update'); }
  };

  const handleLogout = async () => {
    await logoutCurrentDevice();
    navigate('/auth');
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) { toast.error('Please write something'); return; }
    const payload = {
      type: feedbackType,
      text: feedbackText,
      uid: uid || 'guest',
      username: userProfile?.username || 'guest',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'feedback'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      toast.success('Sent! Thank you 🙏');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (err) {
      // Fallback: save locally so it's not lost
      const existing = JSON.parse(localStorage.getItem('uchat_pending_feedback') || '[]');
      existing.push(payload);
      localStorage.setItem('uchat_pending_feedback', JSON.stringify(existing));
      toast.success('Saved locally — will sync when ready 🙏');
      setFeedbackText('');
      setShowFeedbackModal(false);
    }
  };

  const sections = [
    {
      key: 'notifications',
      title: 'Notifications',
      icon: Bell,
      color: '#7C3AED',
      items: null
    },
    {
      key: 'privacy',
      title: 'Privacy',
      icon: Lock,
      color: '#2563EB',
      items: null
    },
    {
      key: 'security',
      title: 'Account & Security',
      icon: Shield,
      color: '#059669',
      items: [
        { label: 'Change Password', action: () => toast('Check your email to reset password'), icon: Lock },
        { label: 'Two-Factor Authentication', action: () => toast.success('Coming soon!'), icon: Shield },
        { label: 'Active Sessions', action: () => toast('Managing sessions...'), icon: Smartphone },
        { label: 'Download My Data', action: () => toast('Preparing your data...'), icon: Download },
      ]
    },
    {
      key: 'verification',
      title: 'Get Verified',
      icon: CheckCircle,
      color: '#0EA5E9',
      badge: '✓',
    },
    {
      key: 'appearance',
      title: 'Appearance',
      icon: theme === 'dark' ? Moon : Sun,
      color: '#F59E0B',
    },
    {
      key: 'support',
      title: 'Help & Support',
      icon: HelpCircle,
      color: '#EF4444',
      items: [
        { label: 'Help Center', action: () => window.open('https://support.uchat.app'), icon: HelpCircle },
        { label: 'Contact Support', action: () => { setFeedbackType('support'); setShowFeedbackModal(true); }, icon: Mail },
        { label: 'Report a Problem', action: () => { setFeedbackType('report'); setShowFeedbackModal(true); }, icon: Info },
      ]
    },
    {
      key: 'feedback',
      title: 'Send Feedback',
      icon: MessageSquare,
      color: '#8B5CF6',
      action: () => { setFeedbackType('feedback'); setShowFeedbackModal(true); }
    },
    {
      key: 'permissions',
      title: 'App Permissions',
      icon: Shield,
      color: '#10B981',
    },
    ...(isAdmin ? [{
      key: 'admin',
      title: isOwner ? '👑 Owner Panel' : '🛡 Admin Panel',
      icon: Star,
      color: '#F59E0B',
    }] : []),
    {
      key: 'about',
      title: 'About UChat',
      icon: Info,
      color: '#6B7280',
      items: [
        { label: 'Version 2.0.0', action: () => {}, icon: Info },
        { label: 'Terms of Service', action: () => {}, icon: Globe },
        { label: 'Privacy Policy', action: () => {}, icon: Lock },
        { label: 'Open Source Licenses', action: () => {}, icon: Globe },
      ]
    },
  ];

  const Toggle = ({ value, onChange }) => (
    <div
      onClick={onChange}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: value ? 'var(--brand-primary, #7C3AED)' : 'var(--border-default)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
    </div>
  );

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
        <div style={{
          margin: 16, padding: 16, borderRadius: 16,
          background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {userProfile.profilePhoto
              ? <img src={userProfile.profilePhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>{(userProfile.displayName || '?')[0].toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              {userProfile.displayName || userProfile.username}
              {userProfile.verified && (
                <svg width="17" height="17" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
                  <path d="M20 2 L23.5 7.5 L30 6 L29.5 12.5 L36 15 L33 21 L38 26 L32.5 29.5 L33 36 L26.5 35 L24 41 L20 37.5 L16 41 L13.5 35 L7 36 L7.5 29.5 L2 26 L7 21 L4 15 L10.5 12.5 L10 6 L16.5 7.5 Z" fill="#1877F2"/>
                  <path d="M13.5 20.5 L18 25.5 L27 15" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {isGuest && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>GUEST</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>@{userProfile.username}</div>
            {isGuest && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Guest ID is permanent and cannot be changed</div>}
          </div>
        </div>
      )}

      {/* Sections */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Notifications */}
        <SettingSection
          title="Notifications"
          icon={<Bell size={18} />}
          iconBg="#7C3AED"
          expanded={activeSection === 'notifications'}
          onToggle={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
        >
          <NotifRow label="Messages" value={notifMessages} onChange={() => { const v = !notifMessages; setNotifMessages(v); saveNotifPrefs('messages', v); }} desc="Get notified when you receive a message" />
          <NotifRow label="Likes" value={notifLikes} onChange={() => { const v = !notifLikes; setNotifLikes(v); saveNotifPrefs('likes', v); }} desc="When someone likes your post" />
          <NotifRow label="Comments" value={notifComments} onChange={() => { const v = !notifComments; setNotifComments(v); saveNotifPrefs('comments', v); }} desc="When someone comments on your post" />
          <NotifRow label="New Followers" value={notifFollows} onChange={() => { const v = !notifFollows; setNotifFollows(v); saveNotifPrefs('follows', v); }} desc="When someone follows you" />
          <NotifRow label="Stories" value={notifStories} onChange={() => { const v = !notifStories; setNotifStories(v); saveNotifPrefs('stories', v); }} desc="When someone mentions you in a story" />
          <NotifRow label="Push Notifications" value={notifPush} onChange={() => { const v = !notifPush; setNotifPush(v); saveNotifPrefs('push', v); }} desc="Receive push notifications on device" />
          <NotifRow label="Email Notifications" value={notifEmail} onChange={() => { const v = !notifEmail; setNotifEmail(v); saveNotifPrefs('email', v); }} desc="Receive email notifications" />
          <NotifRow label="Notification Sound" value={notifSound} onChange={() => { const v = !notifSound; setNotifSound(v); saveNotifPrefs('sound', v); }} desc="Play sound for notifications" last />
        </SettingSection>

        {/* Privacy */}
        <SettingSection
          title="Privacy"
          icon={<Lock size={18} />}
          iconBg="#2563EB"
          expanded={activeSection === 'privacy'}
          onToggle={() => setActiveSection(activeSection === 'privacy' ? null : 'privacy')}
        >
          <NotifRow label="Private Account" value={privateAccount} onChange={togglePrivate} desc="Only approved followers can see your posts" />
          <NotifRow label="Show Activity Status" value={showActivity} onChange={() => setShowActivity(v => !v)} desc="Let others see when you're online" />
          <NotifRow label="Allow Direct Messages" value={allowDMs} onChange={() => setAllowDMs(v => !v)} desc="Allow anyone to send you messages" last />
        </SettingSection>

        {/* Security */}
        <SettingSection
          title="Account & Security"
          icon={<Shield size={18} />}
          iconBg="#059669"
          expanded={activeSection === 'security'}
          onToggle={() => setActiveSection(activeSection === 'security' ? null : 'security')}
        >
          {!isGuest && <SettingItem label="Change Password" icon={<Lock size={16} />} onClick={() => toast('Use forgot password to reset')} />}
          <SettingItem label="Two-Factor Authentication" icon={<Shield size={16} />} onClick={() => toast.success('Coming soon!')} badge="Soon" />
          <SettingItem label="Download My Data" icon={<Download size={16} />} onClick={() => toast('Preparing your data...')} last />
        </SettingSection>

        {/* Get Verified */}
        <div
          onClick={() => setShowVerifyModal(true)}
          style={{
            padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(124,58,237,0.1))',
            border: '1px solid rgba(14,165,233,0.2)',
            display: 'flex', alignItems: 'center', gap: 12
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18 }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Get Verified</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Apply for a verified badge on your profile</div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>

        {/* Appearance */}
        <div
          style={{
            padding: '14px 16px', borderRadius: 14,
            background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 12
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Dark Mode</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{theme === 'dark' ? 'Currently dark' : 'Currently light'}</div>
          </div>
          <Toggle value={theme === 'dark'} onChange={toggleTheme} />
        </div>

        {/* Help & Support */}
        <SettingSection
          title="Help & Support"
          icon={<HelpCircle size={18} />}
          iconBg="#EF4444"
          expanded={activeSection === 'support'}
          onToggle={() => setActiveSection(activeSection === 'support' ? null : 'support')}
        >
          <SettingItem label="Help Center" icon={<HelpCircle size={16} />} onClick={() => toast('Opening help center...')} />
          <SettingItem label="Contact Support" icon={<Mail size={16} />} onClick={() => { setFeedbackType('support'); setShowFeedbackModal(true); }} />
          <SettingItem label="Report a Problem" icon={<Info size={16} />} onClick={() => { setFeedbackType('report'); setShowFeedbackModal(true); }} last />
        </SettingSection>

        {/* Send Feedback */}
        <div
          onClick={() => { setFeedbackType('feedback'); setShowFeedbackModal(true); }}
          style={{
            padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 12
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <MessageSquare size={18} />
          </div>
          <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Send Feedback</div>
          <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>

        {/* App Permissions */}
        <SettingSection
          title="App Permissions"
          icon={<Shield size={18} />}
          iconBg="#10B981"
          expanded={activeSection === 'permissions'}
          onToggle={() => setActiveSection(activeSection === 'permissions' ? null : 'permissions')}
        >
          {/* Microphone */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 18 }}>🎤</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Microphone</div>
              <div style={{ fontSize: 12, color: micPermission === 'granted' ? '#10B981' : micPermission === 'denied' ? '#EF4444' : 'var(--text-tertiary)' }}>
                {micPermission === 'granted' ? 'Allowed' : micPermission === 'denied' ? 'Blocked — change in browser settings' : 'Not requested yet'}
              </div>
            </div>
            {micPermission !== 'granted' && micPermission !== 'denied' && (
              <button onClick={requestMic} style={{ padding: '6px 14px', borderRadius: 10, background: '#10B981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Allow</button>
            )}
            {micPermission === 'granted' && <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>}
            {micPermission === 'denied' && <span style={{ color: '#EF4444', fontWeight: 700 }}>✕</span>}
          </div>
          {/* Camera */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 18 }}>📷</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Camera</div>
              <div style={{ fontSize: 12, color: camPermission === 'granted' ? '#10B981' : camPermission === 'denied' ? '#EF4444' : 'var(--text-tertiary)' }}>
                {camPermission === 'granted' ? 'Allowed' : camPermission === 'denied' ? 'Blocked — change in browser settings' : 'Not requested yet'}
              </div>
            </div>
            {camPermission !== 'granted' && camPermission !== 'denied' && (
              <button onClick={requestCam} style={{ padding: '6px 14px', borderRadius: 10, background: '#10B981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Allow</button>
            )}
            {camPermission === 'granted' && <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>}
            {camPermission === 'denied' && <span style={{ color: '#EF4444', fontWeight: 700 }}>✕</span>}
          </div>
          {/* Notifications */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Push Notifications</div>
              <div style={{ fontSize: 12, color: notifPermission === 'granted' ? '#10B981' : notifPermission === 'denied' ? '#EF4444' : 'var(--text-tertiary)' }}>
                {notifPermission === 'granted' ? 'Allowed' : notifPermission === 'denied' ? 'Blocked — change in browser settings' : 'Not requested yet'}
              </div>
            </div>
            {notifPermission !== 'granted' && notifPermission !== 'denied' && (
              <button onClick={requestNotif} style={{ padding: '6px 14px', borderRadius: 10, background: '#7C3AED', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Allow</button>
            )}
            {notifPermission === 'granted' && <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>}
            {notifPermission === 'denied' && <span style={{ color: '#EF4444', fontWeight: 700 }}>✕</span>}
          </div>
        </SettingSection>

        {/* Admin / Owner Panel — only visible to admins/owners */}
        {isAdmin && (
          <SettingSection
            title={isOwner ? '👑 Owner Panel' : '🛡 Admin Panel'}
            icon={<Star size={18} />}
            iconBg="#F59E0B"
            expanded={activeSection === 'admin'}
            onToggle={() => setActiveSection(activeSection === 'admin' ? null : 'admin')}
          >
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Management</div>
              <SettingItem label="View All Users" icon={<Eye size={16} />} onClick={() => navigate('/admin')} />
              <SettingItem label="Pending Verifications" icon={<UserCheck size={16} />} onClick={() => navigate('/admin?tab=verifications')} />
              <SettingItem label="Review Feedback" icon={<MessageSquare size={16} />} onClick={() => navigate('/admin?tab=feedback')} />
              <SettingItem label="Reported Content" icon={<Shield size={16} />} onClick={() => navigate('/admin?tab=reports')} />
              <SettingItem label="🚫 Ban a User for 1 Hour" icon={<Shield size={16} />} onClick={() => navigate('/admin?tab=users&action=ban1h')} last={!( userProfile?.role === 'owner')} />
              {isOwner && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '14px 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner Controls</div>
                  <SettingItem label="Promote User to Admin" icon={<Star size={16} />} onClick={() => toast('Owner: use the Admin page to promote users')} />
                  <SettingItem label="Platform Analytics" icon={<Eye size={16} />} onClick={() => navigate('/admin?tab=analytics')} />
                  <SettingItem label="🚫 Ban a User for 1 Hour" icon={<Shield size={16} />} onClick={() => navigate('/admin?tab=users&action=ban1h')} last />
                </>
              )}
            </div>
          </SettingSection>
        )}

        {/* About */}
        <SettingSection
          title="About UChat"
          icon={<Info size={18} />}
          iconBg="#6B7280"
          expanded={activeSection === 'about'}
          onToggle={() => setActiveSection(activeSection === 'about' ? null : 'about')}
        >
          <SettingItem label="Version 2.0.0" icon={<Info size={16} />} onClick={() => {}} />
          <SettingItem label="Terms of Service" icon={<Globe size={16} />} onClick={() => {}} />
          <SettingItem label="Privacy Policy" icon={<Lock size={16} />} onClick={() => {}} last />
        </SettingSection>

        {/* Logout */}
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

      {/* Verify Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <Modal onClose={() => setShowVerifyModal(false)} title="Get Verified">
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Verification Badge</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                Verified badges are given to public figures, celebrities, and brands to help people find authentic accounts. Contact our team to apply.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => { setFeedbackType('verification'); setShowVerifyModal(false); setShowFeedbackModal(true); }}
                  style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #0EA5E9, #7C3AED)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15 }}
                >
                  Apply for Verification
                </button>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Only owners can grant verified badges</p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <Modal onClose={() => setShowFeedbackModal(false)} title={
            feedbackType === 'verification' ? 'Apply for Verification' :
            feedbackType === 'support' ? 'Contact Support' :
            feedbackType === 'report' ? 'Report a Problem' : 'Send Feedback'
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feedbackType === 'verification' && (
                <div style={{ padding: 12, borderRadius: 10, background: 'rgba(14,165,233,0.1)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  Explain why you should be verified (public figure, brand, creator, etc.)
                </div>
              )}
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder={feedbackType === 'verification' ? 'Tell us about yourself and why you deserve a verified badge...' : 'Describe your feedback, issue, or question...'}
                style={{
                  width: '100%', minHeight: 120, padding: 12, borderRadius: 12,
                  background: 'var(--surface-3)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: 14, resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowFeedbackModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--surface-3)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={submitFeedback} style={{ flex: 2, padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, #7C3AED, #2563EB)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Send</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

const Modal = ({ onClose, title, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom)' }}
  >
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      style={{ width: '100%', maxWidth: 500, background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

const SettingSection = ({ title, icon, iconBg, expanded, onToggle, children }) => (
  <div style={{ borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
    <button
      onClick={onToggle}
      style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>{icon}</div>
      <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', textAlign: 'left' }}>{title}</span>
      <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
    </button>
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          style={{ overflow: 'hidden', borderTop: '1px solid var(--border-subtle)' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const NotifRow = ({ label, value, onChange, desc, last }) => {
  const Toggle = ({ value, onChange }) => (
    <div onClick={onChange} style={{ width: 48, height: 26, borderRadius: 13, background: value ? '#7C3AED' : 'var(--border-default)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  );
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
};

const SettingItem = ({ label, icon, onClick, badge, last }) => (
  <button
    onClick={onClick}
    style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderBottom: last ? 'none' : '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
  >
    <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
    <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', textAlign: 'left' }}>{label}</span>
    {badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontWeight: 600 }}>{badge}</span>}
    <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
  </button>
);
