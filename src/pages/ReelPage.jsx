// src/pages/ReelPage.jsx — Public shareable reel page
// Works for both logged-in users and anonymous viewers
// After viewing, shows "Login to watch more" CTA

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Bookmark, Repeat2,
  Play, Eye, ArrowLeft, X, Link2
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserByUid, likeReel, unlikeReel, isReelLiked,
  recordReelView, shareReel,
  saveReel, unsaveReel, isReelSaved,
  repostReel, unrepostReel, isReelReposted
} from '../firebase/firestoreService';
import Avatar from '../components/common/Avatar';
import CommentSheet from '../components/posts/CommentSheet';
import toast from 'react-hot-toast';

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0','') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0','') + 'K';
  return String(n || 0);
}

export default function ReelPage() {
  const { reelId } = useParams();
  const { uid, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [reel, setReel] = useState(null);
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showLoginCTA, setShowLoginCTA] = useState(false);
  const videoRef = useRef();
  const viewedRef = useRef(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    loadReel();
  }, [reelId]);

  const loadReel = async () => {
    try {
      const snap = await getDoc(doc(db, 'reels', reelId));
      if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
      const data = { id: snap.id, ...snap.data() };
      setReel(data);
      setLikesCount(data.likesCount || 0);
      setCommentsCount(data.commentsCount || 0);
      setSharesCount(data.sharesCount || 0);
      setRepostsCount(data.repostsCount || 0);

      const authorData = await getUserByUid(data.authorId);
      setAuthor(authorData);

      if (uid) {
        isReelLiked(uid, data.id).then(setLiked);
        isReelSaved(uid, data.id).then(setSaved);
        isReelReposted(uid, data.id).then(setReposted);
      }

      setLoading(false);

      // Record view after 2 seconds
      setTimeout(() => {
        if (!viewedRef.current && uid) {
          viewedRef.current = true;
          recordReelView(uid, data.id).catch(() => {});
        }
        // Show login CTA for non-logged-in users after 5s
        if (!uid) {
          setTimeout(() => setShowLoginCTA(true), 5000);
        }
      }, 2000);
    } catch (e) {
      console.error(e);
      setNotFound(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !reel) return;
    video.play()
      .then(() => setPlaying(true))
      .catch(() => {
        // Autoplay blocked — try muted
        video.muted = true;
        setMuted(true);
        video.play().then(() => setPlaying(true)).catch(() => {});
      });
  }, [reel]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      if (!uid) { setShowLoginCTA(true); return; }
      if (!liked) handleLike();
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 800);
    } else {
      // Single tap = play/pause
      const video = videoRef.current;
      if (video?.paused) { video.play(); setPlaying(true); }
      else { video?.pause(); setPlaying(false); }
    }
    lastTapRef.current = now;
  };

  const handleLike = async () => {
    if (!uid) { setShowLoginCTA(true); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(c => wasLiked ? c - 1 : c + 1);
    if (wasLiked) await unlikeReel(uid, reelId);
    else await likeReel(uid, reelId, reel.authorId);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: reel?.title || 'UChat Reel', url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
      await shareReel(reelId);
      setSharesCount(c => c + 1);
    } catch { toast.error('Could not copy link'); }
  };

  const handleSave = async () => {
    if (!uid) { setShowLoginCTA(true); return; }
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) { await unsaveReel(uid, reelId); toast.success('Removed from saved'); }
      else { await saveReel(uid, reelId); toast.success('Saved'); }
    } catch {
      setSaved(wasSaved);
      toast.error('Could not update saved reels');
    }
  };

  const handleRepost = async () => {
    if (!uid) { setShowLoginCTA(true); return; }
    const wasReposted = reposted;
    setReposted(!wasReposted);
    setRepostsCount(c => wasReposted ? Math.max(0, c - 1) : c + 1);
    try {
      if (wasReposted) { await unrepostReel(uid, reelId); toast.success('Repost removed'); }
      else { await repostReel(uid, reelId, reel.authorId); toast.success('Reposted to your profile'); }
    } catch {
      setReposted(wasReposted);
      setRepostsCount(c => wasReposted ? c + 1 : Math.max(0, c - 1));
      toast.error('Could not repost');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'white', gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>🎬</div>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Reel not found</h2>
      <p style={{ fontSize: 14, opacity: 0.6 }}>This reel may have been deleted or doesn't exist.</p>
      <Link to="/" style={{ padding: '12px 28px', borderRadius: 999, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white', fontWeight: 700, fontSize: 15 }}>
        Open UChat
      </Link>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* Video */}
      {reel.videoUrl && (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          loop
          muted={muted}
          playsInline
          preload="auto"
          onClick={handleTap}
          style={{ width: '100%', height: '100dvh', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
        />
      )}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px', paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
        <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: 99 }}>
            🎬 UChat Reel
          </span>
        </div>
        <button onClick={() => setMuted(m => !m)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: 'none', cursor: 'pointer' }}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Play indicator */}
      <AnimatePresence>
        {!playing && reel.videoUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={32} fill="white" color="white" style={{ marginLeft: 4 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart */}
      <AnimatePresence>
        {heartAnim && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.3, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
            <Heart size={90} fill="#ef4444" color="#ef4444" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 72, padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
        {/* Author */}
        <Link to={isAuthenticated ? `/profile/${author?.username}` : '/auth'} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, textDecoration: 'none' }}>
          <Avatar src={author?.profilePhoto} name={author?.displayName} size={42} verified={author?.verified} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{author?.displayName}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>@{author?.username}</div>
          </div>
          {!isAuthenticated && (
            <Link to="/auth" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 99, background: 'white', color: '#000', textDecoration: 'none' }}>
              Follow
            </Link>
          )}
        </Link>

        {reel.title && <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 4 }}>{reel.title}</p>}
        {reel.caption && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: 10 }}>{reel.caption}</p>}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={12} /> {formatCount(reel.viewsCount)} views
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Heart size={12} fill={liked?'#ef4444':'none'} color={liked?'#ef4444':'rgba(255,255,255,0.7)'} /> {formatCount(likesCount)} likes
          </div>
        </div>
      </div>

      {/* Side actions */}
      <div style={{ position: 'absolute', right: 12, bottom: 'calc(80px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <ActionBtn icon={<Heart size={30} fill={liked?'#ef4444':'none'} color={liked?'#ef4444':'white'} />} label={formatCount(likesCount)} onClick={handleLike} />
        <ActionBtn icon={<MessageCircle size={28} color="white" />} label={formatCount(commentsCount)} onClick={() => uid ? setShowComments(true) : setShowLoginCTA(true)} />
        <ActionBtn icon={<Repeat2 size={28} color={reposted ? '#10b981' : 'white'} />} label={formatCount(repostsCount)} onClick={handleRepost} />
        <ActionBtn icon={<Share2 size={28} color="white" />} label={formatCount(sharesCount)} onClick={handleShare} />
        <ActionBtn icon={<Bookmark size={28} fill={saved ? 'white' : 'none'} color="white" />} onClick={handleSave} />
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <CommentSheet
            post={{ ...reel, commentsCount }}
            onClose={() => setShowComments(false)}
          />
        )}
      </AnimatePresence>

      {/* Login CTA — shown to non-logged-in users after watching */}
      <AnimatePresence>
        {showLoginCTA && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
              background: 'linear-gradient(to bottom, rgba(10,10,10,0.95), #0a0a0a)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px 24px 0 0',
              padding: '24px 24px 36px',
              paddingBottom: 'calc(36px + env(safe-area-inset-bottom))',
            }}
          >
            <button onClick={() => setShowLoginCTA(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--surface-3)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎬</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8 }}>Watch more on UChat</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Join UChat to watch unlimited reels, follow creators, like, comment and chat — all for free.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/auth" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
                Sign Up — It's Free
              </Link>
              <Link to="/auth" style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Log In
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const ActionBtn = ({ icon, label, onClick }) => (
  <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'white', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>
    {icon}
    {label && <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>}
  </button>
);
