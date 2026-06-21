// src/pages/settings/SavedReelsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Bookmark } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSavedReels } from '../../firebase/firestoreService';
import { SubpageHeader, EmptyHint } from '../../components/settings/SettingsUI';

export default function SavedReelsPage() {
  const { uid } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getSavedReels(uid, 60).then(r => { setReels(r); setLoading(false); }).catch(() => setLoading(false));
  }, [uid]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100dvh' }}>
      <SubpageHeader title="Saved reels" subtitle="Only visible to you" />
      <div style={{ padding: 12 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '9/16', background: 'var(--surface-2)', borderRadius: 4 }} />
            ))}
          </div>
        ) : reels.length === 0 ? (
          <EmptyHint>
            <Bookmark size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>No saved reels yet. Tap the bookmark icon on any reel to save it here.</div>
          </EmptyHint>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {reels.map(reel => (
              <Link key={reel.id} to={`/reels/${reel.id}`} style={{ aspectRatio: '9/16', position: 'relative', background: '#111', display: 'block', overflow: 'hidden', borderRadius: 4 }}>
                {reel.thumbnailUrl
                  ? <img src={reel.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <video src={reel.videoUrl} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.55))', display: 'flex', alignItems: 'flex-end', padding: 6 }}>
                  <Play size={13} fill="white" color="white" />
                  <span style={{ color: 'white', fontSize: 11, marginLeft: 3, fontWeight: 600 }}>{reel.viewsCount || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
