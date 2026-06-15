// src/pages/NotificationsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, AtSign, Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markNotificationsRead, getUserByUid } from '../firebase/firestoreService';
import Avatar from '../components/common/Avatar';

const ICON_MAP = {
  like: { icon: Heart, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  comment: { icon: MessageCircle, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  follow: { icon: UserPlus, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  mention: { icon: AtSign, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  message: { icon: MessageCircle, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  default: { icon: Bell, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
};

export default function NotificationsPage() {
  const { uid } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enriched, setEnriched] = useState([]);

  useEffect(() => {
    if (!uid) return;
    loadNotifications();
  }, [uid]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notifs = await getNotifications(uid, 50);
      setNotifications(notifs);
      await markNotificationsRead(uid);

      // Enrich with sender data
      const senderMap = {};
      for (const n of notifs) {
        if (!senderMap[n.senderId]) {
          senderMap[n.senderId] = await getUserByUid(n.senderId);
        }
      }
      setEnriched(notifs.map(n => ({ ...n, sender: senderMap[n.senderId] })));
    } finally {
      setLoading(false);
    }
  };

  // Group by today / this week / earlier
  const groups = groupNotifications(enriched);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'var(--nav-bg)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Notifications</h2>
        <button
          onClick={loadNotifications}
          style={{ fontSize: 13, color: 'var(--brand-secondary)', fontWeight: 600 }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {Array.from({ length: 8 }).map((_, i) => <NotifSkeleton key={i} />)}
        </div>
      ) : enriched.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔔</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>All caught up</h3>
          <p style={{ fontSize: 14 }}>When you get notifications, they'll appear here.</p>
        </div>
      ) : (
        Object.entries(groups).map(([groupLabel, items]) => (
          <div key={groupLabel}>
            <div style={{ padding: '12px 16px 4px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {groupLabel}
              </span>
            </div>
            {items.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <NotifRow notif={notif} />
              </motion.div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

const NotifRow = ({ notif }) => {
  const cfg = ICON_MAP[notif.type] || ICON_MAP.default;
  const IconComp = cfg.icon;
  const ts = notif.createdAt?.toDate
    ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })
    : '';

  const linkTo = notif.postId ? `/post/${notif.postId}`
    : notif.type === 'follow' ? `/profile/${notif.sender?.username}`
    : notif.type === 'message' ? '/messages'
    : '#';

  return (
    <Link
      to={linkTo}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        textDecoration: 'none', color: 'inherit',
        transition: 'background 0.15s',
        background: notif.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)',
        borderBottom: '1px solid var(--border-subtle)'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-1)'}
      onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)'}
    >
      {/* Avatar + icon */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar src={notif.sender?.profilePhoto} name={notif.sender?.displayName} size={44} />
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 20, height: 20, borderRadius: '50%',
          background: cfg.bg, border: '2px solid var(--bg-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <IconComp size={10} color={cfg.color} fill={notif.type === 'like' ? cfg.color : 'none'} />
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          <strong>{notif.sender?.displayName}</strong>{' '}
          {notif.message}
        </p>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, display: 'block' }}>{ts}</span>
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)', flexShrink: 0 }} />
      )}
    </Link>
  );
};

const NotifSkeleton = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', ...skeletonStyle }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: 13, width: '70%', borderRadius: 4, marginBottom: 6, ...skeletonStyle }} />
      <div style={{ height: 11, width: '40%', borderRadius: 4, ...skeletonStyle }} />
    </div>
  </div>
);

const skeletonStyle = {
  background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite'
};

const groupNotifications = (notifs) => {
  const now = new Date();
  const groups = { Today: [], 'This Week': [], Earlier: [] };
  notifs.forEach(n => {
    if (!n.createdAt?.toDate) { groups.Today.push(n); return; }
    const d = n.createdAt.toDate();
    const diff = (now - d) / 1000 / 60 / 60;
    if (diff < 24) groups.Today.push(n);
    else if (diff < 168) groups['This Week'].push(n);
    else groups.Earlier.push(n);
  });
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
};
