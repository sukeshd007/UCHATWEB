// src/pages/AdminPage.jsx — Full admin panel with owner-only controls
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, FileText, Flag, BarChart3, Crown,
  CheckCircle, XCircle, Ban, UserCheck, Trash2, Search,
  AlertTriangle, RefreshCw, Bell, BellOff, MessageSquare,
  Clock, ChevronDown, X, Send, Eye, Lock, Unlock
} from 'lucide-react';
import { useAuth, OWNER_EMAILS } from '../contexts/AuthContext';
import {
  getPlatformStats, getAllReports, resolveReport,
  banUser, unbanUser, verifyUser, unverifyUser,
  setUserRole, getUserByUid, searchUsers, deletePost
} from '../firebase/firestoreService';
import {
  collection, addDoc, serverTimestamp, query, orderBy,
  limit, getDocs, doc, updateDoc, onSnapshot, where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import Avatar from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'reports', label: 'Reports', icon: Flag },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  { key: 'notifications', label: 'Send Notif', icon: Bell },
];

const OWNER_TAB = { key: 'owners', label: 'Owners Panel', icon: Crown };

const BAN_DURATIONS = [
  { label: '1 Hour', hours: 1 },
  { label: '5 Hours', hours: 5 },
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 168 },
  { label: '1 Month', hours: 720 },
  { label: 'Permanently', hours: -1 },
];

export default function AdminPage() {
  const { isOwner, isAdmin, userProfile, uid } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banModal, setBanModal] = useState(null);
  const [selectedBanDur, setSelectedBanDur] = useState(BAN_DURATIONS[3]);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifUrl, setNotifUrl] = useState('');
  const [notifToggle, setNotifToggle] = useState(true); // feedback notif toggle
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [secretMsgs, setSecretMsgs] = useState([]);
  const [secretInput, setSecretInput] = useState('');
  const [secretUserId, setSecretUserId] = useState('');

  const allTabs = isOwner ? [...TABS, OWNER_TAB] : TABS;

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => {
    if (tab === 'feedback') loadFeedbacks();
    if (tab === 'dashboard') loadOnlineUsers();
  }, [tab]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([getPlatformStats(), getAllReports('pending')]);
      setStats(s);
      const enriched = await Promise.all(r.map(async rep => ({
        ...rep,
        reporter: await getUserByUid(rep.reporterUid).catch(() => null)
      })));
      setReports(enriched);
    } finally { setLoading(false); }
  };

  const loadOnlineUsers = async () => {
    const q = query(collection(db, 'users'), where('onlineStatus', '==', true), limit(20));
    const snap = await getDocs(q);
    setOnlineUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadFeedbacks = async () => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSearchUsers = async () => {
    if (!userSearch.trim()) return;
    setLoading(true);
    try {
      const results = await searchUsers(userSearch.trim().toLowerCase(), 20);
      setUsers(results);
    } finally { setLoading(false); }
  };

  const handleBanUser = async () => {
    if (!banModal) return;
    try {
      const until = selectedBanDur.hours === -1
        ? null
        : new Date(Date.now() + selectedBanDur.hours * 3600000);
      await banUser(banModal.uid, until ? until.toISOString() : 'permanent');
      toast.success(`${banModal.username} banned (${selectedBanDur.label})`);
      setBanModal(null);
      handleSearchUsers();
    } catch { toast.error('Failed to ban user'); }
  };

  const handleUnban = async (u) => {
    try { await unbanUser(u.uid); toast.success(`${u.username} unbanned`); handleSearchUsers(); }
    catch { toast.error('Failed to unban'); }
  };

  const handleVerify = async (u) => {
    if (!isOwner) { toast.error('Only owners can verify users'); return; }
    try {
      if (u.verified) { await unverifyUser(u.uid); toast.success('Badge removed'); }
      else { await verifyUser(u.uid); toast.success(`${u.username} verified ✓`); }
      handleSearchUsers();
    } catch { toast.error('Failed'); }
  };

  const handleSetRole = async (u, role) => {
    if (!isOwner) { toast.error('Only owners can manage admins'); return; }
    try {
      await setUserRole(u.uid, role);
      toast.success(`${u.username} is now ${role}`);
      handleSearchUsers();
    } catch { toast.error('Failed'); }
  };

  const sendPlatformNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) { toast.error('Fill in title and message'); return; }
    try {
      const workerUrl = import.meta.env.VITE_R2_WORKER_URL;
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET;

      if (workerUrl && adminSecret) {
        const res = await fetch(`${workerUrl}/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: notifTitle, body: notifBody, url: notifUrl || '/', adminSecret }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Worker returned error');
        }
      }

      // Always log in Firestore regardless
      await addDoc(collection(db, 'platform_notifications'), {
        title: notifTitle,
        body: notifBody,
        url: notifUrl || '/',
        sentBy: uid,
        sentByUsername: userProfile?.username,
        createdAt: serverTimestamp(),
        type: 'broadcast',
      });

      toast.success('🔔 Notification sent to all users!');
      setNotifTitle(''); setNotifBody(''); setNotifUrl('');
    } catch (err) {
      console.error('Broadcast error:', err);
      toast.error(err.message || 'Failed to send notification');
    }
  };

  const sendSecretMsg = async () => {
    if (!secretInput.trim() || !secretUserId.trim()) { toast.error('Fill in user UID or username and message'); return; }
    try {
      let recipientId = secretUserId.trim();
      if (recipientId.length < 28 && !recipientId.includes(' ')) {
        try {
          const { getUserByUsername } = await import('../firebase/firestoreService');
          const found = await getUserByUsername(recipientId.replace('@', ''));
          if (found?.id) recipientId = found.id;
        } catch { /* use as-is */ }
      }
      // Write to notifications — NO admin name stored, identity fully hidden
      await addDoc(collection(db, 'notifications'), {
        recipientId,
        senderId: null,
        type: 'system',
        message: secretInput.trim(),
        isSystem: true,
        read: false,
        createdAt: serverTimestamp(),
      });
      toast.success('\uD83D\uDD12 Secret notification delivered!');
      setSecretInput(''); setSecretUserId('');
    } catch (err) {
      console.error('Secret msg error:', err);
      toast.error('Failed to send — verify the UID/username');
    }
  };

  const resolveFeedback = async (fbId, status) => {
    try {
      await updateDoc(doc(db, 'feedback', fbId), { status, resolvedAt: serverTimestamp(), resolvedBy: uid });
      toast.success('Feedback resolved');
      loadFeedbacks();
    } catch { toast.error('Failed'); }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 80px', minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 0', borderBottom: '1px solid var(--border-subtle)',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(37,99,235,0.05))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          {isOwner ? <Crown size={22} style={{ color: '#F59E0B' }} /> : <Shield size={22} style={{ color: '#7C3AED' }} />}
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{isOwner ? 'Owner Panel' : 'Admin Panel'}</h1>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: isOwner ? 'rgba(245,158,11,0.15)' : 'rgba(124,58,237,0.1)', color: isOwner ? '#F59E0B' : '#7C3AED', fontWeight: 600, marginLeft: 'auto' }}>
            {isOwner ? 'OWNER' : 'ADMIN'}
          </span>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 1 }}>
          {allTabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 14px', borderRadius: '10px 10px 0 0', border: 'none',
                  background: tab === t.key ? 'var(--bg-primary)' : 'transparent',
                  color: tab === t.key ? (t.key === 'owners' ? '#F59E0B' : '#7C3AED') : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap', borderBottom: tab === t.key ? '2px solid var(--brand-primary,#7C3AED)' : 'none'
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 16 }}>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: '👥', color: '#7C3AED' },
                { label: 'Posts', value: stats?.totalPosts ?? '—', icon: '📸', color: '#2563EB' },
                { label: 'Pending Reports', value: reports.length, icon: '🚨', color: '#EF4444' },
                { label: 'Online Now', value: onlineUsers.length, icon: '🟢', color: '#22c55e' },
              ].map(s => (
                <div key={s.label} style={{ padding: 16, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Online users */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🟢 Online Users ({onlineUsers.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onlineUsers.slice(0, 8).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <Avatar src={u.profilePhoto} name={u.displayName} size={34} verified={u.verified} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.displayName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{u.username}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                </div>
              ))}
              {onlineUsers.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No users online right now</p>}
            </div>

            <button onClick={loadDashboard} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}

        {/* Reports */}
        {tab === 'reports' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending Reports ({reports.length})</h3>
            {reports.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No pending reports 🎉</p>}
            {reports.map(rep => (
              <div key={rep.id} style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <AlertTriangle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{rep.reason}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{rep.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      By: @{rep.reporter?.username || rep.reporterUid} · Target: {rep.targetType} {rep.targetId}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => resolveReport(rep.id, 'resolved').then(loadDashboard)}
                    style={{ padding: '6px 14px', borderRadius: 8, background: '#22c55e', color: 'white', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Resolve
                  </button>
                  <button onClick={() => resolveReport(rep.id, 'dismissed').then(loadDashboard)}
                    style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
                placeholder="Search by username or name…"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
              <button onClick={handleSearchUsers} style={{ padding: '10px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                <Search size={16} />
              </button>
            </div>

            {users.map(u => (
              <div key={u.uid} style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar src={u.profilePhoto} name={u.displayName} size={40} verified={u.verified} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {u.displayName}
                      {u.verified && <VerifiedBadge size={14} />}
                      {u.role === 'admin' && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>ADMIN</span>}
                      {u.banned && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>BANNED</span>}
                      {u.isGuest && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>GUEST</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{u.username} · {u.email || 'No email'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {u.followersCount || 0} followers · {u.postsCount || 0} posts
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {u.banned ? (
                    <AdminBtn onClick={() => handleUnban(u)} color="#22c55e" icon={<Unlock size={13} />}>Unban</AdminBtn>
                  ) : (
                    <>
                      <AdminBtn onClick={() => setBanModal(u)} color="#EF4444" icon={<Ban size={13} />}>Ban</AdminBtn>
                      <AdminBtn onClick={async () => {
                        const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                        await banUser(u.uid, until);
                        toast.success(`${u.username} banned for 1 hour`);
                        handleSearchUsers();
                      }} color="#F97316" icon={<Clock size={13} />}>Ban 1h</AdminBtn>
                    </>
                  )}
                  {isOwner && (
                    <>
                      <AdminBtn onClick={() => handleVerify(u)} color="#0EA5E9" icon={<CheckCircle size={13} />}>
                        {u.verified ? 'Unverify' : 'Verify'}
                      </AdminBtn>
                      {u.role !== 'admin' && !OWNER_EMAILS.includes(u.email) ? (
                        <AdminBtn onClick={() => handleSetRole(u, 'admin')} color="#F59E0B" icon={<Shield size={13} />}>Make Admin</AdminBtn>
                      ) : (u.role === 'admin' && !OWNER_EMAILS.includes(u.email)) ? (
                        <AdminBtn onClick={() => handleSetRole(u, 'user')} color="#6B7280" icon={<XCircle size={13} />}>Remove Admin</AdminBtn>
                      ) : null}
                    </>
                  )}
                  <AdminBtn onClick={() => setSecretUserId(u.uid) || setTab('feedback')} color="#7C3AED" icon={<MessageSquare size={13} />}>DM</AdminBtn>
                </div>
              </div>
            ))}
            {users.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Search for a user above</p>}
          </div>
        )}

        {/* Feedback */}
        {tab === 'feedback' && (
          <div>
            {/* Admin secret message */}
            <div style={{ marginBottom: 20, padding: 14, borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} style={{ color: '#7C3AED' }} /> Secret Admin Message
              </h4>
              <input
                value={secretUserId} onChange={e => setSecretUserId(e.target.value)}
                placeholder="User UID or username…"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={secretInput} onChange={e => setSecretInput(e.target.value)}
                  placeholder="Type admin message…"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
                <button onClick={sendSecretMsg} style={{ padding: '8px 14px', borderRadius: 10, background: '#7C3AED', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <Send size={15} />
                </button>
              </div>
            </div>

            {/* Toggle feedback notifications */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', marginBottom: 16 }}>
              <Bell size={16} style={{ color: '#7C3AED' }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Notify me for new feedback</span>
              <ToggleSwitch value={notifToggle} onChange={() => setNotifToggle(v => !v)} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Feedback & Reports ({feedbacks.length})</h3>
            {feedbacks.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No feedback yet</p>}
            {feedbacks.map(fb => (
              <div key={fb.id} style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
                    background: fb.type === 'verification' ? 'rgba(14,165,233,0.15)' : fb.type === 'report' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.1)',
                    color: fb.type === 'verification' ? '#0EA5E9' : fb.type === 'report' ? '#EF4444' : '#7C3AED',
                  }}>
                    {fb.type?.toUpperCase() || 'FEEDBACK'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                    @{fb.username || fb.uid}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>{fb.text}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {fb.status === 'pending' ? (
                    <>
                      <button onClick={() => resolveFeedback(fb.id, 'resolved')} style={{ padding: '5px 12px', borderRadius: 8, background: '#22c55e', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Resolve</button>
                      <button onClick={() => resolveFeedback(fb.id, 'dismissed')} style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--surface-3)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✓ {fb.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Send Notification */}
        {tab === 'notifications' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📣 Broadcast Notification</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Send a push to ALL UChat users at once — free via Firebase FCM</p>

            {/* Setup note */}
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, marginBottom: 4 }}>⚙️ One-time setup required</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                1. Firebase Console → Project Settings → Cloud Messaging → copy <strong>Server key</strong><br/>
                2. Cloudflare Worker dashboard → add env var <code>FCM_SERVER_KEY</code><br/>
                3. Add env var <code>ADMIN_SECRET</code> (any password) to both Cloudflare Worker and your <code>.env</code> as <code>VITE_ADMIN_SECRET</code>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                placeholder="Notification title (e.g. UChat 2.0 is live! 🎉)"
                style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
              <textarea
                value={notifBody} onChange={e => setNotifBody(e.target.value)}
                placeholder="Notification message…"
                rows={3}
                style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <input
                value={notifUrl} onChange={e => setNotifUrl(e.target.value)}
                placeholder="Click URL (optional, e.g. /reels)"
                style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
              <button
                onClick={sendPlatformNotification}
                disabled={!notifTitle.trim() || !notifBody.trim()}
                style={{ padding: '14px', borderRadius: 12, background: (notifTitle.trim() && notifBody.trim()) ? 'linear-gradient(135deg,#7C3AED,#2563EB)' : 'var(--surface-3)', color: (notifTitle.trim() && notifBody.trim()) ? 'white' : 'var(--text-tertiary)', border: 'none', fontWeight: 700, fontSize: 15, cursor: (notifTitle.trim() && notifBody.trim()) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Bell size={18} /> Send to All Users
              </button>
            </div>
          </div>
        )}

        {/* Owner Panel */}
        {tab === 'owners' && isOwner && (
          <div>
            <div style={{ padding: 14, borderRadius: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Crown size={18} style={{ color: '#F59E0B' }} />
                <span style={{ fontWeight: 700, color: '#F59E0B' }}>Owner-Only Controls</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Only <strong>support.uchat@gmail.com</strong> and <strong>help.uchat@outlook.com</strong> can access this panel.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Add/Remove Admins', desc: 'Manage admin roles via Users tab', icon: '🛡️', action: () => setTab('users') },
                { label: 'Grant Verified Badge', desc: 'Verify accounts via Users tab', icon: '🏅', action: () => setTab('users') },
                { label: 'View All Feedback', desc: 'See all support, reports, verification requests', icon: '📬', action: () => setTab('feedback') },
                { label: 'Send Broadcasts', desc: 'Push notifications to all users', icon: '📣', action: () => setTab('notifications') },
                { label: 'Platform Analytics', desc: 'View users, posts, activity stats', icon: '📊', action: () => setTab('dashboard') },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ban Duration Modal */}
      <AnimatePresence>
        {banModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setBanModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 500, background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#EF4444' }}>Ban @{banModal.username}</h3>
                <button onClick={() => setBanModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {BAN_DURATIONS.map(d => (
                  <button key={d.label} onClick={() => setSelectedBanDur(d)}
                    style={{
                      padding: '12px 16px', borderRadius: 12, border: `2px solid ${selectedBanDur.label === d.label ? '#EF4444' : 'var(--border-default)'}`,
                      background: selectedBanDur.label === d.label ? 'rgba(239,68,68,0.08)' : 'var(--surface-2)',
                      color: selectedBanDur.label === d.label ? '#EF4444' : 'var(--text-primary)',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                    <Clock size={15} /> {d.label}
                  </button>
                ))}
              </div>
              <button onClick={handleBanUser}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#EF4444', color: 'white', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Ban for {selectedBanDur.label}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AdminBtn = ({ onClick, color, icon, children }) => (
  <button onClick={onClick}
    style={{ padding: '5px 12px', borderRadius: 8, background: `${color}18`, border: `1px solid ${color}40`, color, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
    {icon} {children}
  </button>
);

const ToggleSwitch = ({ value, onChange }) => (
  <div onClick={onChange} style={{ width: 48, height: 26, borderRadius: 13, background: value ? '#7C3AED' : 'var(--border-default)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: 3, left: value ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
  </div>
);
