// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Grid, Play, UserPlus, UserCheck, MessageCircle,
  MoreHorizontal, Link as LinkIcon, Repeat2,
  Flag, UserX, Share2, Bell, BellOff, Lock, BookmarkIcon, X, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserByUsername, getUserPosts, getUserReels, followUser, unfollowUser,
  isFollowing, getOrCreateChat, getFollowers, getFollowing, getUserByUid,
  getUserReposts, getSavedReels
} from '../firebase/firestoreService';
import Avatar from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'posts', icon: Grid, label: 'Posts' },
  { id: 'reels', icon: Play, label: 'Reels' },
  { id: 'reposts', icon: Repeat2, label: 'Reposts' },
  { id: 'saved', icon: BookmarkIcon, label: 'Saved' },
];

export default function ProfilePage() {
  const { username } = useParams();
  const { userProfile, uid } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [repostsLoaded, setRepostsLoaded] = useState(false);
  const [savedReels, setSavedReels] = useState([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false); // they follow you back
  const [followLoading, setFollowLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [notifOn, setNotifOn] = useState(false);
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following'
  const [followListUsers, setFollowListUsers] = useState([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const targetUsername = username || userProfile?.username;
  const isOwnProfile = userProfile?.username === targetUsername;

  // Saved tab only visible on own profile
  const visibleTabs = isOwnProfile ? TABS : TABS.filter(t => t.id !== 'saved');

  useEffect(() => {
    if (!targetUsername) return;
    loadProfile();
  }, [targetUsername]);

  // Lazy-load Reposts tab content the first time it's opened
  useEffect(() => {
    if (tab === 'reposts' && profile?.id && !repostsLoaded) {
      getUserReposts(profile.id, 30)
        .then(r => { setReposts(r); setRepostsLoaded(true); })
        .catch(() => setRepostsLoaded(true));
    }
  }, [tab, profile?.id, repostsLoaded]);

  // Lazy-load Saved tab content the first time it's opened (own profile only)
  useEffect(() => {
    if (tab === 'saved' && isOwnProfile && uid && !savedLoaded) {
      getSavedReels(uid, 30)
        .then(r => { setSavedReels(r); setSavedLoaded(true); })
        .catch(() => setSavedLoaded(true));
    }
  }, [tab, isOwnProfile, uid, savedLoaded]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const p = await getUserByUsername(targetUsername);
      if (!p) { navigate('/'); return; }
      setProfile(p);
      const [postsResult, reelsResult] = await Promise.all([
        getUserPosts(p.id, null, 12),
        getUserReels(p.id, null, 12),
      ]);
      setPosts(postsResult.posts);
      setReels(reelsResult.reels);
      setReposts([]);
      setRepostsLoaded(false);
      setSavedReels([]);
      setSavedLoaded(false);
      if (uid && !isOwnProfile) {
        const [iFollow, theyFollow] = await Promise.all([
          isFollowing(uid, p.id),
          isFollowing(p.id, uid),
        ]);
        setFollowing(iFollow);
        setFollowsYou(theyFollow);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!uid || followLoading) return;
    if (!profile?.id) { toast.error('Profile not loaded'); return; }
    setFollowLoading(true);
    // Optimistic UI — update immediately, revert on error
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    if (wasFollowing) {
      setProfile(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1) } : prev);
    } else {
      setProfile(prev => prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : prev);
    }
    try {
      if (wasFollowing) {
        await unfollowUser(uid, profile.id);
        toast('Unfollowed');
      } else {
        const result = await followUser(uid, profile.id);
        if (result?.followedBack) {
          toast.success('You followed back! 🎉');
        } else {
          toast.success('Following!');
        }
      }
    } catch (err) {
      console.error('Follow error:', err);
      // Revert optimistic update
      setFollowing(wasFollowing);
      setProfile(prev => {
        if (!prev) return prev;
        const adj = wasFollowing ? 1 : -1;
        return { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) + adj) };
      });
      toast.error('Action failed — check connection');
    }
    finally { setFollowLoading(false); }
  };

  const handleMessage = async () => {
    const chatId = await getOrCreateChat(uid, profile.id);
    navigate(`/messages/${chatId}`);
  };

  const openFollowModal = async (type) => {
    setFollowModal(type);
    setFollowListLoading(true);
    setFollowListUsers([]);
    try {
      const ids = type === 'followers'
        ? await getFollowers(profile.id, 50)
        : await getFollowing(profile.id, 50);
      const users = await Promise.all(ids.map(id => getUserByUid(id).catch(() => null)));
      setFollowListUsers(users.filter(Boolean));
    } catch { /* silent */ }
    finally { setFollowListLoading(false); }
  };

  if (loading || !profile) return <ProfileSkeleton />;

  const menuItems = isOwnProfile ? [
    { label: 'Edit Profile', icon: <Settings size={16} />, action: () => navigate('/edit-profile') },
    { label: 'Settings', icon: <Settings size={16} />, action: () => navigate('/settings') },
    { label: 'Share Profile', icon: <Share2 size={16} />, action: () => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); } },
  ] : [
    { label: following ? 'Unfollow' : 'Follow', icon: following ? <UserX size={16} /> : <UserPlus size={16} />, action: handleFollow },
    { label: notifOn ? 'Turn Off Notifications' : 'Turn On Notifications', icon: notifOn ? <BellOff size={16} /> : <Bell size={16} />, action: () => setNotifOn(v => !v) },
    { label: 'Share Profile', icon: <Share2 size={16} />, action: () => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); } },
    { label: 'Report', icon: <Flag size={16} />, action: () => toast('Report submitted'), danger: true },
    { label: 'Block', icon: <UserX size={16} />, action: () => toast('User blocked'), danger: true },
  ];

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', paddingBottom: 80 }}>
      {/* Cover photo */}
      <div style={{
        height: 180,
        background: profile.coverPhoto
          ? `url(${profile.coverPhoto}) center/cover`
          : 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
          {isOwnProfile && (
            <Link to="/settings" style={iconBtn}>
              <Settings size={18} />
            </Link>
          )}
          <button onClick={() => setShowMenu(true)} style={{ ...iconBtn, border: 'none', cursor: 'pointer' }}>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Profile info section */}
      <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Avatar + action buttons row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -44, marginBottom: 14 }}>
          <div style={{ border: '4px solid var(--bg-primary)', borderRadius: '50%', background: 'var(--bg-primary)', flexShrink: 0 }}>
            <Avatar src={profile.profilePhoto} name={profile.displayName} size={96} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 4 }}>
            {isOwnProfile ? (
              <>
                <Link to="/edit-profile" style={outlineBtn}>Edit Profile</Link>
                <Link to="/settings" style={{ ...iconBtnSm }}>
                  <Settings size={16} />
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  style={{
                    padding: '8px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                    background: following ? 'transparent' : (!followsYou ? 'linear-gradient(135deg,#7C3AED,#2563EB)' : 'linear-gradient(135deg,#059669,#0EA5E9)'),
                    border: following ? '1.5px solid var(--border-default)' : 'none',
                    color: following ? 'var(--text-primary)' : 'white',
                    opacity: followLoading ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {following
                    ? <><UserCheck size={15} /> Following</>
                    : followsYou
                      ? <><UserPlus size={15} /> Follow Back</>
                      : <><UserPlus size={15} /> Follow</>
                  }
                </button>
                <button
                  onClick={handleMessage}
                  style={{
                    padding: '8px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    border: '1.5px solid var(--border-default)',
                    color: 'var(--text-primary)', background: 'transparent',
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <MessageCircle size={15} /> Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{profile.displayName}</h1>
          {profile.verified && <VerifiedBadge size={20} />}
          {profile.role === 'admin' && <Badge color="#F59E0B" bg="rgba(245,158,11,0.15)">ADMIN</Badge>}
          {profile.isGuest && <Badge color="#7C3AED" bg="rgba(124,58,237,0.1)">GUEST</Badge>}
          {profile.isPrivate && <Lock size={14} style={{ color: 'var(--text-tertiary)' }} />}
        </div>

        {/* Username — always shown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500, margin: 0 }}>
            @{profile.username}
          </p>
          {!isOwnProfile && followsYou && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
              background: 'var(--surface-3)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}>
              Follows you
            </span>
          )}
        </div>

        {profile.bio && (
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
            {profile.bio}
          </p>
        )}
        {profile.website && (
          <a href={profile.website} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#7C3AED', fontWeight: 600, marginBottom: 12 }}>
            <LinkIcon size={13} />
            {profile.website.replace(/^https?:\/\//, '')}
          </a>
        )}

        {/* Stats bar — like Instagram */}
        <div style={{ display: 'flex', gap: 0, marginTop: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          {[
            { label: 'Posts', value: profile.postsCount || 0 },
            { label: 'Followers', value: profile.followersCount || 0, clickable: true, type: 'followers' },
            { label: 'Following', value: profile.followingCount || 0, clickable: true, type: 'following' },
            { label: 'Reels', value: profile.reelsCount || 0 },
          ].map((stat, i) => (
            <div
              key={stat.label}
              onClick={() => stat.clickable && openFollowModal(stat.type)}
              style={{
                flex: 1, textAlign: 'center',
                borderRight: i < 3 ? '1px solid var(--border-subtle)' : 'none',
                cursor: stat.clickable ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: stat.clickable ? 'var(--brand-primary,#7C3AED)' : 'var(--text-primary)' }}>
                {formatCount(stat.value)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
        {visibleTabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, minWidth: 60, padding: '12px 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              <span style={{ display: window.innerWidth < 380 ? 'none' : 'inline' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ padding: '4px 0' }}
        >
          {tab === 'posts' && (
            posts.length === 0
              ? <EmptyState icon="camera" title="No posts yet" subtitle={isOwnProfile ? 'Share your first photo or video.' : 'No posts shared yet.'} />
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                  {posts.map(post => <GridPost key={post.id} post={post} />)}
                </div>
              )
          )}
          {tab === 'reels' && (
            reels.length === 0
              ? <EmptyState icon="play" title="No reels yet" subtitle={isOwnProfile ? 'Share your first reel.' : 'No reels shared yet.'} />
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                  {reels.map(reel => (
                    <Link key={reel.id} to={`/reels/${reel.id}`} style={{ aspectRatio: '9/16', position: 'relative', background: '#111', display: 'block', overflow: 'hidden' }}>
                      {reel.thumbnailUrl
                        ? <img src={reel.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <video src={reel.videoUrl} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5))', display: 'flex', alignItems: 'flex-end', padding: 6 }}>
                        <Play size={14} fill="white" color="white" />
                        <span style={{ color: 'white', fontSize: 11, marginLeft: 3 }}>{reel.viewsCount || 0}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
          )}
          {tab === 'reposts' && (
            !repostsLoaded
              ? <GridSkeleton />
              : reposts.length === 0
                ? <EmptyState icon="repeat" title="No reposts yet" subtitle={isOwnProfile ? 'Repost content to share it here.' : 'No reposts yet.'} />
                : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                    {reposts.map(reel => (
                      <Link key={reel.id} to={`/reels/${reel.id}`} style={{ aspectRatio: '9/16', position: 'relative', background: '#111', display: 'block', overflow: 'hidden' }}>
                        {reel.thumbnailUrl
                          ? <img src={reel.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <video src={reel.videoUrl} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        }
                        <div style={{ position: 'absolute', top: 6, right: 6 }}>
                          <Repeat2 size={14} color="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                        </div>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5))', display: 'flex', alignItems: 'flex-end', padding: 6 }}>
                          <Play size={14} fill="white" color="white" />
                          <span style={{ color: 'white', fontSize: 11, marginLeft: 3 }}>{reel.viewsCount || 0}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )
          )}
          {tab === 'saved' && isOwnProfile && (
            !savedLoaded
              ? <GridSkeleton />
              : savedReels.length === 0
                ? <EmptyState icon="bookmark" title="No saved reels" subtitle="Reels you save will appear here. Only you can see this." />
                : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                    {savedReels.map(reel => (
                      <Link key={reel.id} to={`/reels/${reel.id}`} style={{ aspectRatio: '9/16', position: 'relative', background: '#111', display: 'block', overflow: 'hidden' }}>
                        {reel.thumbnailUrl
                          ? <img src={reel.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <video src={reel.videoUrl} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        }
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5))', display: 'flex', alignItems: 'flex-end', padding: 6 }}>
                          <Play size={14} fill="white" color="white" />
                          <span style={{ color: 'white', fontSize: 11, marginLeft: 3 }}>{reel.viewsCount || 0}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom sheet menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowMenu(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 500, background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0', padding: '12px 0 32px', overflow: 'hidden' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-default)', margin: '0 auto 16px' }} />
              {menuItems.map((item, i) => (
                <button key={i} onClick={() => { item.action(); setShowMenu(false); }}
                  style={{
                    width: '100%', padding: '14px 20px', background: 'none', border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    color: item.danger ? '#EF4444' : 'var(--text-primary)',
                    fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <span style={{ color: item.danger ? '#EF4444' : 'var(--text-secondary)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Followers / Following Modal */}
      <AnimatePresence>
        {followModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFollowModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 540, background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0', maxHeight: '75vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>{followModal}</h3>
                <button onClick={() => setFollowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}><X size={20} /></button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {followListLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={24} style={{ color: 'var(--text-tertiary)' }} /></div>
                ) : followListUsers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 32, fontSize: 14 }}>No {followModal} yet</p>
                ) : (
                  followListUsers.map(u => (
                    <Link
                      key={u.id}
                      to={`/profile/${u.username}`}
                      onClick={() => setFollowModal(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <Avatar src={u.profilePhoto} name={u.displayName} size={42} verified={u.verified} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{u.displayName}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>@{u.username}</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatCount = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
};

const iconBtn = {
  width: 36, height: 36, borderRadius: 10,
  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
  textDecoration: 'none',
};
const outlineBtn = {
  padding: '8px 18px', borderRadius: 12,
  border: '1.5px solid var(--border-default)',
  fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
  background: 'transparent', textDecoration: 'none',
  display: 'flex', alignItems: 'center', gap: 6,
  transition: 'all 0.2s',
};
const iconBtnSm = {
  width: 36, height: 36, borderRadius: 12,
  border: '1.5px solid var(--border-default)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-primary)', background: 'transparent',
  textDecoration: 'none',
};

const Badge = ({ color, bg, children }) => (
  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: bg, color, fontWeight: 700 }}>
    {children}
  </span>
);

const GridPost = ({ post }) => {
  const [hovered, setHovered] = useState(false);
  const url = post.mediaUrls?.[0] || post.mediaUrl;
  return (
    <Link to={`/post/${post.id}`}
      style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', display: 'block', background: 'var(--surface-2)' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      {url
        ? post.mediaType === 'video'
          ? <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
          : <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        : <div style={{ width: '100%', height: '100%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Grid size={24} style={{ color: 'var(--text-tertiary)' }} />
          </div>
      }
      {hovered && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>♥ {post.likesCount || 0}</span>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>💬 {post.commentsCount || 0}</span>
        </div>
      )}
    </Link>
  );
};

const EMPTY_ICONS = {
  camera: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  play: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  repeat: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  bookmark: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

const EmptyState = ({ icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-tertiary)' }}>
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
      {EMPTY_ICONS[icon] || EMPTY_ICONS.camera}
    </div>
    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h3>
    <p style={{ fontSize: 14 }}>{subtitle}</p>
  </div>
);

const GridSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ aspectRatio: '9/16', background: 'var(--surface-2)' }} />
    ))}
  </div>
);

const ProfileSkeleton = () => (
  <div style={{ maxWidth: 935, margin: '0 auto' }}>
    <div style={{ height: 180, background: 'var(--surface-2)' }} />
    <div style={{ padding: '0 16px 20px' }}>
      <div style={{ marginTop: -44, marginBottom: 20, width: 96, height: 96, borderRadius: '50%', background: 'var(--surface-2)' }} />
      <div style={{ height: 18, width: 160, borderRadius: 4, background: 'var(--surface-2)', marginBottom: 8 }} />
      <div style={{ height: 13, width: 100, borderRadius: 4, background: 'var(--surface-2)' }} />
    </div>
  </div>
);
