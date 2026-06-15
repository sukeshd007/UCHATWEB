// src/components/feed/SuggestedUsers.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSuggestedUsers, followUser, unfollowUser, isFollowing } from '../../firebase/firestoreService';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function SuggestedUsers() {
  const { uid, userProfile } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!uid) return;
    getSuggestedUsers(uid, 8).then(setUsers);
  }, [uid]);

  if (!users.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Current user */}
      {userProfile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
          <Avatar src={userProfile.profilePhoto} name={userProfile.displayName} size={40} verified={userProfile.verified} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link to={`/profile/${userProfile.username}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userProfile.displayName}
            </Link>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>@{userProfile.username}</span>
          </div>
          <Link to="/auth" style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-secondary)' }}>
            Switch
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Suggested for you</span>
        <Link to="/search" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>See all</Link>
      </div>

      {users.map(user => (
        <UserRow key={user.id} user={user} currentUid={uid} />
      ))}

      <p style={{ fontSize: 11, color: 'var(--text-disabled)', padding: '0 4px', lineHeight: 1.6 }}>
        © 2024 UChat · Privacy · Terms · Help
      </p>
    </div>
  );
}

const UserRow = ({ user, currentUid }) => {
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    if (currentUid) isFollowing(currentUid, user.id).then(setFollowed);
  }, [currentUid, user.id]);

  const handleFollow = async () => {
    try {
      if (followed) { await unfollowUser(currentUid, user.id); setFollowed(false); }
      else { await followUser(currentUid, user.id); setFollowed(true); }
    } catch { toast.error('Action failed'); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
      <Link to={`/profile/${user.username}`}>
        <Avatar src={user.profilePhoto} name={user.displayName} size={36} verified={user.verified} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/profile/${user.username}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.displayName}
          {user.verified && <span style={{ marginLeft: 4, color: 'var(--verified-color)', fontSize: 11 }}>✓</span>}
        </Link>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>@{user.username}</span>
      </div>
      <button
        onClick={handleFollow}
        style={{
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          color: followed ? 'var(--text-secondary)' : 'var(--brand-secondary)',
          padding: '4px 0'
        }}
      >
        {followed ? 'Following' : 'Follow'}
      </button>
    </div>
  );
};
