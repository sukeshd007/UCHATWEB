// src/components/feed/HomeReels.jsx
// Instagram Reels-style horizontal strip on the home feed
// Sorted by author follower count (most followers first)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Play, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getReels, getUserByUid } from '../../firebase/firestoreService';
import Avatar from '../common/Avatar';
import CreateReelModal from '../reels/CreateReelModal';
import { AnimatePresence } from 'framer-motion';

function formatCount(n) {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1).replace('.0','')+'M';
  if (n >= 1_000) return (n/1_000).toFixed(1).replace('.0','')+'K';
  return String(n||0);
}

export default function HomeReels() {
  const { uid } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      const result = await getReels(null, 12);
      const enriched = await Promise.all(
        result.reels.map(async r => {
          const author = await getUserByUid(r.authorId);
          return { ...r, author };
        })
      );
      // Sort by author follower count — highest first (most popular creators)
      enriched.sort((a, b) => (b.author?.followersCount || 0) - (a.author?.followersCount || 0));
      setReels(enriched);
    } catch (e) {
      console.error('HomeReels load failed:', e);
    }
  };

  if (!reels.length) return null;

  return (
    <>
      <div style={{
        background: 'var(--surface-1)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        marginBottom: 4,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>🎬 Reels</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, padding: '5px 10px',
                borderRadius: 99, background: 'var(--brand-gradient)',
                color: 'white', border: 'none', cursor: 'pointer'
              }}
            >
              <Plus size={12} /> Create
            </button>
            <button
              onClick={() => navigate('/reels')}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 10px',
                borderRadius: 99, background: 'var(--surface-3)',
                color: 'var(--text-secondary)', border: 'none', cursor: 'pointer'
              }}
            >
              See all
            </button>
          </div>
        </div>

        {/* Reel cards scroll */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 14px',
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}>
          {reels.map((reel, i) => (
            <ReelCard key={reel.id} reel={reel} rank={i} onClick={() => navigate('/reels')} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateReelModal onClose={() => { setShowCreate(false); loadReels(); }} />
        )}
      </AnimatePresence>
    </>
  );
}

function ReelCard({ reel, rank, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: 110,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        background: '#111',
        aspectRatio: '9/16',
      }}
    >
      {/* Thumbnail or gradient placeholder */}
      {reel.thumbnailUrl ? (
        <img
          src={reel.thumbnailUrl}
          alt={reel.title || 'reel'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(135deg, hsl(${(rank * 47) % 360},60%,25%), hsl(${(rank * 47 + 120) % 360},60%,15%))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Play size={24} fill="rgba(255,255,255,0.6)" color="rgba(255,255,255,0.6)" />
        </div>
      )}

      {/* Overlay gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      {/* Play icon center */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Play size={14} fill="white" color="white" style={{ marginLeft: 2 }} />
      </div>

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
          <Avatar src={reel.author?.profilePhoto} name={reel.author?.displayName} size={16} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70 }}>
            {reel.author?.displayName?.split(' ')[0] || reel.author?.username}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Heart size={9} fill="#ef4444" color="#ef4444" />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            {formatCount(reel.likesCount)}
          </span>
          {rank === 0 && (
            <span style={{ fontSize: 8, background: 'rgba(255,200,0,0.9)', color: '#000', fontWeight: 800, padding: '1px 4px', borderRadius: 4, marginLeft: 2 }}>
              🔥
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
