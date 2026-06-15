// src/pages/HomePage.jsx — loads from local cache first, then syncs from Firestore
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../contexts/AuthContext';
import { getFeedPosts } from '../firebase/firestoreService';
import { savePosts, getCachedPosts } from '../utils/localDB';
import PostCard from '../components/posts/PostCard';
import StoryBar from '../components/feed/StoryBar';
import SuggestedUsers from '../components/feed/SuggestedUsers';
import PostSkeleton from '../components/posts/PostSkeleton';

export default function HomePage() {
  const { uid } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef(null);
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  // Show cached posts instantly on mount
  useEffect(() => {
    getCachedPosts().then(cached => {
      if (cached.length) {
        const sorted = cached.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPosts(sorted);
        setLoading(false);
      }
    });
  }, []);

  const loadPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const result = await getFeedPosts(reset ? null : lastDocRef.current);
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
      const normalized = result.posts.map(p => ({
        ...p,
        createdAt: p.createdAt?.seconds ? p.createdAt : { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      }));
      setPosts(prev => reset ? normalized : [...prev, ...normalized]);
      savePosts(normalized).catch(() => {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [hasMore]);

  useEffect(() => { loadPosts(true); }, [uid]);
  useEffect(() => {
    if (inView && !loadingMore && hasMore && posts.length > 0) loadPosts();
  }, [inView]);

  return (
    <div className="feed-layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
        <div style={{ padding: '12px 12px 8px' }}><StoryBar /></div>
        {loading && !posts.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
            {[1,2,3].map(i => <PostSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <EmptyFeed />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 0 16px' }}>
            {posts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }} style={{ padding: '0 12px' }}>
                <PostCard post={post} />
              </motion.div>
            ))}
            <div ref={sentinelRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
              {loadingMore && <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', animation: 'spin 0.8s linear infinite' }} />}
              {!hasMore && posts.length > 0 && <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>You're all caught up ✓</p>}
            </div>
          </div>
        )}
      </div>
      <aside style={{ display: 'none' }} className="feed-sidebar">
        <div style={{ position: 'sticky', top: 80, padding: '0 0 0 4px' }}><SuggestedUsers /></div>
      </aside>
      <style>{`@media (min-width: 1100px) { .feed-sidebar { display: block !important } }`}</style>
    </div>
  );
}

const EmptyFeed = () => (
  <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)' }}>
    <div style={{ fontSize: 52, marginBottom: 16 }}>📸</div>
    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Nothing here yet</h3>
    <p style={{ fontSize: 14, lineHeight: 1.6 }}>Follow people or explore content in the Search tab.</p>
  </div>
);
