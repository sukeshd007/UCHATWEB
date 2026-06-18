// src/pages/SearchPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, Play, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { searchUsers, getFeedPosts, getReels, getUserByUid, followUser, unfollowUser, isFollowing } from '../firebase/firestoreService';
import Avatar from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import toast from 'react-hot-toast';

const TRENDING = ['#photography', '#travel', '#food', '#music', '#tech', '#art', '#nature', '#fitness'];

export default function SearchPage() {
  const { uid } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('top'); // top | people | posts
  const [reels, setReels] = useState([]);
  const debounceRef = useRef();

  useEffect(() => {
    // Load explore posts and reels on mount
    getFeedPosts(null, 12).then(r => setPosts(r.posts));
    getReels(null, 12).then(async r => {
      const enriched = await Promise.all(r.reels.map(async reel => {
        const author = await getUserByUid(reel.authorId).catch(() => null);
        return { ...reel, author };
      }));
      setReels(enriched);
    }).catch(() => {});
  }, []);

  const handleSearch = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setUsers([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(val.trim().toLowerCase(), 20);
        setUsers(results.filter(u => u.id !== uid));
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [uid]);

  const isSearching = query.trim().length > 0;

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', minHeight: '100%' }}>
      {/* Search bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '12px 16px',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search UChat…"
            autoFocus
            style={{
              width: '100%', padding: '11px 40px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-primary)', fontSize: 14,
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--brand-primary)';
              e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border-subtle)';
              e.target.style.boxShadow = 'none';
            }}
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isSearching ? (
          <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Trending */}
            <div style={{ padding: '16px 16px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <TrendingUp size={18} style={{ color: 'var(--brand-primary)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Trending</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TRENDING.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag.slice(1))}
                    style={{
                      padding: '7px 14px', borderRadius: 'var(--radius-full)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      fontSize: 13, fontWeight: 500,
                      color: 'var(--brand-secondary)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.target.style.background = 'var(--surface-3)'; e.target.style.borderColor = 'var(--brand-primary)'; }}
                    onMouseLeave={e => { e.target.style.background = 'var(--surface-2)'; e.target.style.borderColor = 'var(--border-default)'; }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Explore tabs */}
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', gap: 0, padding: '0 16px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 8 }}>
                {[['posts', '📸 Posts'], ['reels', '🎬 Reels']].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} style={{
                    padding: '8px 18px', fontSize: 13, fontWeight: 700,
                    background: tab === key ? 'var(--brand-gradient)' : 'var(--surface-2)',
                    color: tab === key ? 'white' : 'var(--text-secondary)',
                    borderRadius: key === 'posts' ? '10px 0 0 10px' : '0 10px 10px 0',
                    border: '1.5px solid var(--border-default)',
                    borderLeft: key === 'reels' ? 'none' : undefined,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>{label}</button>
                ))}
              </div>
              {tab === 'posts' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, padding: '0 3px' }}>
                  {posts.map((post, i) => (
                    <ExplorePost key={post.id} post={post} featured={i === 0 || i === 7} />
                  ))}
                  {posts.length === 0 && <p style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>No posts yet</p>}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, padding: '0 3px' }}>
                  {reels.map(reel => (
                    <ExploreReel key={reel.id} reel={reel} />
                  ))}
                  {reels.length === 0 && <p style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>No reels yet</p>}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Results tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 16px' }}>
              {['top', 'people'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '12px 16px',
                    fontSize: 14, fontWeight: 600,
                    color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    borderBottom: tab === t ? '2px solid var(--text-primary)' : '2px solid transparent',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
                {[1,2,3].map(i => <UserRowSkeleton key={i} />)}
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No results</p>
                <p style={{ fontSize: 14 }}>Try a different search term.</p>
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {users.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <SearchUserRow user={user} currentUid={uid} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ExplorePost = ({ post, featured }) => {
  const url = post.mediaUrls?.[0] || post.mediaUrl;
  return (
    <Link
      to={`/post/${post.id}`}
      style={{
        display: 'block', overflow: 'hidden',
        background: 'var(--surface-2)',
        gridColumn: featured ? 'span 1' : undefined,
        gridRow: featured ? 'span 2' : undefined,
        aspectRatio: featured ? '1/2' : '1/1',
        position: 'relative'
      }}
    >
      {url && (
        <img
          src={url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      )}
    </Link>
  );
};

const SearchUserRow = ({ user, currentUid }) => {
  const [followed, setFollowed] = useState(false);
  useEffect(() => {
    if (currentUid && user.id !== currentUid) isFollowing(currentUid, user.id).then(setFollowed);
  }, [currentUid, user.id]);

  const handleFollow = async () => {
    try {
      if (followed) { await unfollowUser(currentUid, user.id); setFollowed(false); }
      else { await followUser(currentUid, user.id); setFollowed(true); }
    } catch { toast.error('Action failed'); }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      transition: 'background 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Link to={`/profile/${user.username}`}>
        <Avatar src={user.profilePhoto} name={user.displayName} size={44} verified={user.verified} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/profile/${user.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName}
            </span>
            {user.verified && <VerifiedBadge size={16} style={{ marginLeft: 2 }} />}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>@{user.username}</span>
          {user.bio && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.bio}</p>}
        </Link>
      </div>
      {user.id !== currentUid && (
        <button
          onClick={handleFollow}
          style={{
            padding: '7px 16px', borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
            background: followed ? 'transparent' : 'var(--brand-gradient)',
            border: followed ? '1px solid var(--border-default)' : 'none',
            color: followed ? 'var(--text-primary)' : 'white',
            transition: 'all 0.15s'
          }}
        >
          {followed ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
};

const UserRowSkeleton = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)' }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: 13, width: 120, borderRadius: 4, background: 'var(--surface-2)', marginBottom: 6, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)' }} />
      <div style={{ height: 11, width: 80, borderRadius: 4, background: 'var(--surface-2)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)' }} />
    </div>
  </div>
);

const ExploreReel = ({ reel }) => {
  const videoRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={`/reels/${reel.id}`}
      style={{
        display: 'block', overflow: 'hidden',
        background: 'var(--surface-2)',
        aspectRatio: '9/16',
        position: 'relative',
        borderRadius: 4,
      }}
      onMouseEnter={() => { setHovered(true); videoRef.current?.play?.(); }}
      onMouseLeave={() => { setHovered(false); if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
    >
      {/* Thumbnail (first frame) via video */}
      {reel.videoUrl && (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {/* Play icon overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'flex-end',
        padding: '8px 6px', transition: 'background 0.2s'
      }}>
        <Play size={16} fill="white" color="white" style={{ marginBottom: 2 }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
          @{reel.author?.username || ''}
        </span>
      </div>
    </Link>
  );
};
