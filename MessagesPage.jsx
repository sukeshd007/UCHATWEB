// src/pages/settings/BlockedAccountsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBlockedUsers, unblockUser } from '../../firebase/firestoreService';
import { SubpageHeader, EmptyHint } from '../../components/settings/SettingsUI';
import Avatar from '../../components/common/Avatar';
import toast from 'react-hot-toast';

export default function BlockedAccountsPage() {
  const { uid } = useAuth();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getBlockedUsers(uid).then(list => { setBlocked(list); setLoading(false); }).catch(() => setLoading(false));
  }, [uid]);

  const handleUnblock = async (targetUid, username) => {
    const prev = blocked;
    setBlocked(b => b.filter(u => u.id !== targetUid));
    try {
      await unblockUser(uid, targetUid);
      toast.success(`Unblocked @${username}`);
    } catch {
      setBlocked(prev);
      toast.error('Could not unblock \u2014 try again');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100dvh' }}>
      <SubpageHeader title="Blocked accounts" subtitle={`${blocked.length} blocked`} />
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading\u2026</div>
      ) : blocked.length === 0 ? (
        <EmptyHint>
          <Ban size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div>You haven\u2019t blocked anyone. Blocked accounts can\u2019t see your profile, posts, or message you.</div>
        </EmptyHint>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {blocked.map(u => (
            <div key={u.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to={`/profile/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                <Avatar src={u.profilePhoto} name={u.displayName} size={42} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>@{u.username}</div>
                </div>
              </Link>
              <button
                onClick={() => handleUnblock(u.id, u.username)}
                style={{ padding: '7px 16px', borderRadius: 10, background: 'var(--surface-3)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
