// src/pages/ReelsPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Bookmark,
  Volume2, VolumeX, Play, Plus, ChevronUp, ChevronDown, Eye,
  Link2, X, Send
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getReels, likeReel, unlikeReel, isReelLiked,
  recordReelView, getUserByUid, shareReel
} from '../firebase/firestoreService';
import { getLocalReelVideo } from '../utils/localDB';
import Avatar from '../components/common/Avatar';
import CreateReelModal from '../components/reels/CreateReelModal';
import CommentSheet from '../components/posts/CommentSheet';
import toast from 'react-hot-toast';

function AnimCount({ value }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const diff = value - prev.current;
    const steps = 12;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplay(Math.round(prev.current + (diff * step) / steps));
      if (step >= steps) { clearInterval(timer); prev.current = value; }
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{formatCount(display)}</span>;
}

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

// ── Share Sheet ──────────────────────────────────────────────────────────────
function ShareSheet({ url, title, onClose, onShared }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied!');
      onShared();
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleNative = async () => {
    try {
      await navigator.share({ title: title || 'Check out this reel on UChat!', url });
      onShared();
    } catch {}
  };

  const shareApps = [
    {
      label: 'WhatsApp',
      color: '#25D366',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.523 5.853L0 24l6.334-1.501A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.488-5.187-1.344l-.372-.22-3.762.891.942-3.668-.242-.38A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      ),
      href: `https://wa.me/?text=${encodeURIComponent((title || 'Check this reel!') + '\n' + url)}`,
    },
    {
      label: 'Telegram',
      color: '#229ED9',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || 'Check this reel!')}`,
    },
    {
      label: 'Twitter/X',
      color: '#000000',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || 'Check this reel on UChat!')}`,
    },
    {
      label: 'Instagram',
      color: '#E1306C',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
        </svg>
      ),
      // Instagram doesn't support direct URL sharing; open the app
      href: null,
      onClick: () => {
        navigator.clipboard.writeText(url);
        toast.success('Link copied — paste it in Instagram!');
        onShared();
      },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
          background: 'var(--bg-secondary)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 36px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)'
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-default)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Share Reel</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="var(--text-secondary)" />
          </button>
        </div>

        {/* App icons row */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-start', marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {shareApps.map(app => (
            <button
              key={app.label}
              onClick={() => {
                if (app.onClick) { app.onClick(); }
                else if (app.href) {
                  window.open(app.href, '_blank', 'noopener');
                  onShared();
                }
                onClose();
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', minWidth: 60 }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                {app.icon}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{app.label}</span>
            </button>
          ))}

          {/* Native share — shows if supported (Android/iOS) */}
          {'share' in navigator && (
            <button
              onClick={() => { handleNative(); onClose(); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', minWidth: 60 }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={22} color="var(--text-primary)" />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>More</span>
            </button>
          )}
        </div>

        {/* Copy link row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
          <Link2 size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, flexShrink: 0,
              background: copied ? 'var(--success-color)' : 'var(--brand-gradient)',
              color: 'white', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
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
      const enriched = await Promise.all(
        result.reels.map(async r => {
          const author = await getUserByUid(r.authorId);
          // Resolve local file reels: load blob URL from IndexedDB
          let videoUrl = r.videoUrl;
          if (r.isLocalFile) {
            const blobUrl = await getLocalReelVideo(r.id);
            videoUrl = blobUrl || ''; // empty string if not on this device
          }
          return { ...r, author, videoUrl };
        })
      );
      setReels(prev => reset ? enriched : [...prev, ...enriched]);
    } finally {
      setLoading(false);
    }
  };

  const updateReel = useCallback((id, patch) => {
    setReels(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const handleScroll = useCallback((direction) => {
    if (direction === 'down' && current < reels.length - 1) {
      setCurrent(c => c + 1);
      if (current >= reels.length - 2 && hasMore) loadReels();
    } else if (direction === 'up' && current > 0) {
      setCurrent(c => c - 1);
    }
  }, [current, reels.length, hasMore]);

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

  if (!reels.length) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'white', gap: 16 }}>
      <p style={{ fontSize: 18, fontWeight: 700 }}>No reels yet</p>
      <p style={{ fontSize: 13, opacity: 0.5 }}>Be the first to share one!</p>
      <button onClick={() => setShowCreate(true)} style={{ padding: '10px 24px', background: 'var(--brand-gradient)', color: 'white', borderRadius: 'var(--radius-full)', fontSize: 14, fontWeight: 600 }}>
        Create Reel
      </button>
      <AnimatePresence>{showCreate && <CreateReelModal onClose={() => { setShowCreate(false); loadReels(true); }} />}</AnimatePresence>
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', zIndex: 10 }}>
      {reels.map((reel, i) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          isActive={i === current}
          onUpdate={(patch) => updateReel(reel.id, patch)}
          style={{
            position: 'absolute', inset: 0,
            transform: `translateY(${(i - current) * 100}%)`,
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      ))}

      {/* Nav buttons */}
      <div style={{ position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 }}>
        {current > 0 && (
          <button onClick={() => handleScroll('up')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ChevronUp size={20} />
          </button>
        )}
        {current < reels.length - 1 && (
          <button onClick={() => handleScroll('down')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ChevronDown size={20} />
          </button>
        )}
      </div>

      {/* Create button */}
      <button onClick={() => setShowCreate(true)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <Plus size={22} />
      </button>

      <AnimatePresence>
        {showCreate && <CreateReelModal onClose={() => { setShowCreate(false); loadReels(true); }} />}
      </AnimatePresence>
    </div>
  );
}

// ── Reel Item ─────────────────────────────────────────────────────────────────
function ReelItem({ reel, isActive, onUpdate, style }) {
  const { uid } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [viewsCount, setViewsCount] = useState(reel.viewsCount || 0);
  const [commentsCount] = useState(reel.commentsCount || 0);
  const [sharesCount, setSharesCount] = useState(reel.sharesCount || 0);
  const [muted, setMuted] = useState(false); // start unmuted
  const [playing, setPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoRef = useRef();
  const lastTapRef = useRef(0);
  const viewedRef = useRef(false);

  const reelUrl = `${window.location.origin}/reels/${reel.id}`;

  useEffect(() => {
    if (uid) isReelLiked(uid, reel.id).then(setLiked);
  }, [uid, reel.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.muted = muted;
      video.play()
        .then(() => setPlaying(true))
        .catch(() => {
          // Browser blocked unmuted autoplay — try muted
          video.muted = true;
          setMuted(true);
          video.play().then(() => setPlaying(true)).catch(() => {});
        });
      if (!viewedRef.current && uid) {
        viewedRef.current = true;
        recordReelView(uid, reel.id).then(() => {
          const newCount = viewsCount + 1;
          setViewsCount(newCount);
          onUpdate({ viewsCount: newCount });
        }).catch(() => {});
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
      if (!liked) handleLike();
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 800);
    } else {
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
    const newCount = wasLiked ? likesCount - 1 : likesCount + 1;
    setLikesCount(newCount);
    onUpdate({ likesCount: newCount });
    if (wasLiked) await unlikeReel(uid, reel.id);
    else await likeReel(uid, reel.id, reel.authorId);
  };

  const onShared = async () => {
    try {
      await shareReel(reel.id);
      const newCount = sharesCount + 1;
      setSharesCount(newCount);
      onUpdate({ sharesCount: newCount });
    } catch {}
  };

  return (
    <div style={{ ...style, userSelect: 'none' }}>
      {reel.videoUrl ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          loop muted={muted} playsInline
          preload={isActive ? 'auto' : 'none'}
          onClick={handleTap}
          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
        />
      ) : (
        // Local file not available on this device
        <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(255,255,255,0.5)' }}>
          <Play size={40} />
          <p style={{ fontSize: 13 }}>Video only available on owner's device</p>
        </div>
      )}

      {/* Play indicator */}
      <AnimatePresence>
        {!playing && isActive && reel.videoUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={28} fill="white" color="white" style={{ marginLeft: 3 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart */}
      <AnimatePresence>
        {heartAnim && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.3, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 80, pointerEvents: 'none' }}>
            <Heart size={80} fill="#ef4444" color="#ef4444" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)', pointerEvents: 'none' }} />

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 90, left: 16, right: 80, color: 'white' }}>
        <Link to={`/profile/${reel.author?.username}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'white', textDecoration: 'none' }}>
          <Avatar src={reel.author?.profilePhoto} name={reel.author?.displayName} size={36} verified={reel.author?.verified} />
          <div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>@{reel.author?.username}</span>
            {reel.author?.verified && <span style={{ fontSize: 11, color: '#60a5fa', marginLeft: 4 }}>✓</span>}
          </div>
        </Link>
        {reel.title && <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{reel.title}</p>}
        {reel.caption && <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.85, marginBottom: 10 }}>{reel.caption}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <StatBadge icon={<Eye size={12} />} value={viewsCount} label="views" />
          <StatBadge icon={<Heart size={12} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : 'white'} />} value={likesCount} label="likes" />
          <StatBadge icon={<MessageCircle size={12} />} value={commentsCount} label="comments" />
          <StatBadge icon={<Share2 size={12} />} value={sharesCount} label="shares" />
        </div>
      </div>

      {/* Side actions */}
      <div style={{ position: 'absolute', right: 12, bottom: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <ReelAction
          icon={<Heart size={28} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : 'white'} />}
          label={<AnimCount value={likesCount} />}
          onClick={handleLike}
          active={liked}
        />
        <ReelAction
          icon={<MessageCircle size={28} color="white" />}
          label={<AnimCount value={commentsCount} />}
          onClick={() => setShowComments(true)}
        />
        <ReelAction
          icon={<Share2 size={28} color="white" />}
          label={<AnimCount value={sharesCount} />}
          onClick={() => setShowShare(true)}
        />
        <ReelAction
          icon={<Bookmark size={28} fill={saved ? 'white' : 'none'} color="white" />}
          label="Save"
          onClick={() => setSaved(s => !s)}
        />
        <ReelAction
          icon={muted ? <VolumeX size={24} color="white" /> : <Volume2 size={24} color="white" />}
          onClick={() => setMuted(m => !m)}
        />
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentSheet
            post={{ ...reel, commentsCount }}
            onClose={() => setShowComments(false)}
          />
        )}
      </AnimatePresence>

      {/* Share Sheet */}
      <AnimatePresence>
        {showShare && (
          <ShareSheet
            url={reelUrl}
            title={reel.title || reel.caption || 'Check this reel on UChat!'}
            onClose={() => setShowShare(false)}
            onShared={onShared}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const StatBadge = ({ icon, value, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', padding: '3px 8px', borderRadius: 20 }}>
    {icon}
    <span style={{ fontWeight: 700 }}>{formatCount(value)}</span>
    <span style={{ opacity: 0.7 }}>{label}</span>
  </div>
);

const ReelAction = ({ icon, label, onClick, active }) => (
  <motion.button
    onClick={onClick}
    whileTap={{ scale: 0.85 }}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'white', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))', background: 'none', border: 'none', cursor: 'pointer' }}
  >
    <motion.div animate={active ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
      {icon}
    </motion.div>
    {label !== undefined && (
      <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
    )}
  </motion.button>
);
