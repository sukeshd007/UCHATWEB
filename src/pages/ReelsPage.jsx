// src/pages/ReelsPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, VolumeX, Play, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getReels, likeReel, unlikeReel, isReelLiked, recordReelView, getUserByUid } from '../firebase/firestoreService';
import Avatar from '../components/common/Avatar';
import CreateReelModal from '../components/reels/CreateReelModal';
import CommentSheet from '../components/posts/CommentSheet';
import { AnimatePresence as AP } from 'framer-motion';

export default function ReelsPage() {
  const { uid } = useAuth();
  const [reels, setReels] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const lastDocRef = useRef(null);
  const containerRef = useRef();

  useEffect(() => { loadReels(true); }, []);

  const loadReels = async (reset = false) => {
    try {
      const result = await getReels(reset ? null : lastDocRef.current, 5);
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
      
      // Enrich with author data
      const enriched = await Promise.all(
        result.reels.map(async r => ({
          ...r,
          author: await getUserByUid(r.authorId)
        }))
      );
      setReels(prev => reset ? enriched : [...prev, ...enriched]);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback((direction) => {
    if (direction === 'down' && current < reels.length - 1) {
      setCurrent(c => c + 1);
      if (current >= reels.length - 2 && hasMore) loadReels();
    } else if (direction === 'up' && current > 0) {
      setCurrent(c => c - 1);
    }
  }, [current, reels.length, hasMore]);

  // Touch/wheel navigation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startY = 0;
    const onTouchStart = (e) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const diff = startY - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 50) handleScroll(diff > 0 ? 'down' : 'up');
    };
    const onWheel = (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 30) handleScroll(e.deltaY > 0 ? 'down' : 'up');
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, [handleScroll]);

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0,
        background: '#000',
        overflow: 'hidden',
        zIndex: 10
      }}
    >
      {/* Reels */}
      {reels.map((reel, i) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          isActive={i === current}
          style={{
            position: 'absolute', inset: 0,
            transform: `translateY(${(i - current) * 100}%)`,
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      ))}

      {/* Navigation buttons */}
      <div style={{
        position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20
      }}>
        {current > 0 && (
          <button
            onClick={() => handleScroll('up')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}
          >
            <ChevronUp size={20} />
          </button>
        )}
        {current < reels.length - 1 && (
          <button
            onClick={() => handleScroll('down')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}
          >
            <ChevronDown size={20} />
          </button>
        )}
      </div>

      {/* Create button */}
      <button
        onClick={() => setShowCreate(true)}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 20,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
        }}
      >
        <Plus size={22} />
      </button>

      <AnimatePresence>
        {showCreate && <CreateReelModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function ReelItem({ reel, isActive, style }) {
  const { uid } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const videoRef = useRef();
  const lastTapRef = useRef(0);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (uid) isReelLiked(uid, reel.id).then(setLiked);
  }, [uid, reel.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().then(() => setPlaying(true)).catch(() => {});
      if (!viewedRef.current && uid) {
        viewedRef.current = true;
        recordReelView(uid, reel.id);
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap = like
      if (!liked) handleLike();
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 800);
    } else {
      // Single tap = toggle play
      const video = videoRef.current;
      if (video?.paused) { video.play(); setPlaying(true); }
      else { video?.pause(); setPlaying(false); }
    }
    lastTapRef.current = now;
  };

  const handleLike = async () => {
    if (!uid) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(c => wasLiked ? c - 1 : c + 1);
    if (wasLiked) await unlikeReel(uid, reel.id);
    else await likeReel(uid, reel.id, reel.authorId);
  };

  return (
    <div style={{ ...style, userSelect: 'none' }}>
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        loop
        muted={muted}
        playsInline
        preload={isActive ? 'auto' : 'none'}
        onClick={handleTap}
        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
      />

      {/* Play indicator */}
      <AnimatePresence>
        {!playing && isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Play size={28} fill="white" color="white" style={{ marginLeft: 3 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart */}
      <AnimatePresence>
        {heartAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{
              position: 'absolute', top: '45%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 80, pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))'
            }}
          >
            ❤️
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '60%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
        pointerEvents: 'none'
      }} />

      {/* Bottom info */}
      <div style={{
        position: 'absolute', bottom: 80, left: 16, right: 72,
        color: 'white'
      }}>
        <Link to={`/profile/${reel.author?.username}`} style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'white', textDecoration: 'none'
        }}>
          <Avatar src={reel.author?.profilePhoto} name={reel.author?.displayName} size={36} verified={reel.author?.verified} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>@{reel.author?.username}</span>
          {reel.author?.verified && <span style={{ fontSize: 12, color: '#60a5fa' }}>✓</span>}
        </Link>
        {reel.title && <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{reel.title}</p>}
        {reel.caption && <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>{reel.caption}</p>}
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
          👁 {(reel.viewsCount || 0).toLocaleString()} views
        </p>
      </div>

      {/* Side actions */}
      <div style={{
        position: 'absolute', right: 12, bottom: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
      }}>
        <ReelAction
          icon={<Heart size={26} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : 'white'} />}
          label={likesCount.toLocaleString()}
          onClick={handleLike}
        />
        <ReelAction
          icon={<MessageCircle size={26} color="white" />}
          label={reel.commentsCount || 0}
          onClick={() => setShowComments(true)}
        />
        <ReelAction icon={<Send size={26} color="white" />} label="Share" onClick={() => {}} />
        <ReelAction icon={<Bookmark size={26} color="white" />} label="Save" onClick={() => {}} />
        <ReelAction
          icon={muted ? <VolumeX size={24} color="white" /> : <Volume2 size={24} color="white" />}
          onClick={() => setMuted(m => !m)}
        />
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <CommentSheet
            post={{ ...reel, commentsCount: reel.commentsCount }}
            onClose={() => setShowComments(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const ReelAction = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
    }}
  >
    {icon}
    {label !== undefined && (
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
    )}
  </button>
);
