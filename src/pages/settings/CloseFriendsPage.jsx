// src/pages/settings/CloseFriendsPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Check, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getFollowers, getUserByUid, addCloseFriend, removeCloseFriend } from '../../firebase/firestoreService';
import { SubpageHeader, EmptyHint } from '../../components/settings/SettingsUI';
import Avatar from '../../components/common/Avatar';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import toast from 'react-hot-toast';

export default function CloseFriendsPage() {
  const { uid, userProfile } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [closeFriends, setCloseFriends] = useState(new Set(userProfile?.closeFriends || []));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const ids = await getFollowers(uid, 200);
      const profiles = await Promise.all(ids.map(id => getUserByUid(id).catch(() => null)));
      setFollowers(profiles.filter(Boolean));
      setLoading(false);
    })();
  }, [uid]);

  const toggle = async (targetUid) => {
    const isMember = closeFriends.has(targetUid);
    const next = new Set(closeFriends);
    isMember ? next.delete(targetUid) : next.add(targetUid);
    setCloseFriends(next);
    try {
      if (isMember) await removeCloseFriend(uid, targetUid);
      else await addCloseFriend(uid, targetUid);
    } catch {
      setCloseFriends(closeFriends); // revert
      toast.error('Could not update Close Friends');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return followers;
    return followers.filter(f =>
      f.displayName?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q)
    );
  }, [followers, search]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100dvh' }}>
      <SubpageHeader title="Close Friends" subtitle={`${closeFriends.size} people on your list`} />

      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
          Only people on this list will see content you choose to share with Close Friends.
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search followers"
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: 'var(--radius-full)',
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading followers\u2026</div>
      ) : followers.length === 0 ? (
        <EmptyHint>
          <Users size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div>You don\u2019t have any followers yet \u2014 Close Friends is built from people who follow you.</div>
        </EmptyHint>
      ) : (
        <div>
          {filtered.map(f => (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
            >
              <Avatar src={f.profilePhoto} name={f.displayName} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {f.displayName}{f.verified && <VerifiedBadge size={13} />}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>@{f.username}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: closeFriends.has(f.id) ? '#16A34A' : 'transparent',
                border: closeFriends.has(f.id) ? 'none' : '2px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {closeFriends.has(f.id) && <Check size={13} color="white" strokeWidth={3} />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
