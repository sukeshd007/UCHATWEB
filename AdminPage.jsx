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
  const [followsYou, setFollowsYou] = useState(false);

  useEffect(() => {
    if (!currentUid) return;
    Promise.all([
      isFollowing(currentUid, user.id),
      isFollowing(user.id, currentUid),
    ]).then(([iFollow, theyFollow]) => {
      setFollowed(iFollow);
      setFollowsYou(theyFollow);
    });
  }, [currentUid, user.id]);

  const handleFollow = async () => {
    try {
      if (followed) {
        await unfollowUser(currentUid, user.id);
        setFollowed(false);
      } else {
        await followUser(currentUid, user.id);
        setFollowed(true);
      }
    } catch (err) {
      console.error('Follow error:', err);
      toast.error('Action failed');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
      <Link to={`/profile/${user.username}`}>
        <Avatar src={user.profilePhoto} name={user.displayName} size={36} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/profile/${user.username}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.displayName}
          {user.verified && (
            <svg width="13" height="13" viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
              <path d="M20 2 L23.5 7.5 L30 6 L29.5 12.5 L36 15 L33 21 L38 26 L32.5 29.5 L33 36 L26.5 35 L24 41 L20 37.5 L16 41 L13.5 35 L7 36 L7.5 29.5 L2 26 L7 21 L4 15 L10.5 12.5 L10 6 L16.5 7.5 Z" fill="#1877F2"/>
              <path d="M13.5 20.5 L18 25.5 L27 15" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </Link>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {followsYou && !followed ? '• Follows you' : `@${user.username}`}
        </span>
      </div>
      <button
        onClick={handleFollow}
        style={{
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          color: followed ? 'var(--text-secondary)' : (followsYou ? '#059669' : 'var(--brand-secondary)'),
          padding: '4px 0'
        }}
      >
        {followed ? 'Following' : followsYou ? 'Follow Back' : 'Follow'}
      </button>
    </div>
  );
};
