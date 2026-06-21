// src/components/posts/ReelMenu.jsx
// BUGFIX: reels had NO options menu anywhere in the app — no way to delete a
// reel (not even as the owner/admin), report one, or copy its link. This
// mirrors PostMenu.jsx's pattern but is wired to the reel equivalents
// (deleteReel, contentType: 'reel', /reels/:id link).
import { motion } from 'framer-motion';
import { Trash2, Flag, Link, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { deleteReel, reportContent, followUser, unfollowUser, isFollowing } from '../../firebase/firestoreService';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

export default function ReelMenu({ reel, onClose, onDeleted }) {
  const { uid, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);
  const isOwnerOfReel = reel.authorId === uid;
  const canModerate = isAdmin || isOwner;

  useEffect(() => {
    if (uid && !isOwnerOfReel) isFollowing(uid, reel.authorId).then(setFollowing);
  }, [uid, reel.authorId]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this reel? This can\'t be undone.')) return;
    try {
      await deleteReel(reel.id, reel.authorId);
      toast.success('Reel deleted');
      onClose();
      if (onDeleted) onDeleted();
      else navigate('/reels');
    } catch { toast.error('Delete failed'); }
  };

  const handleReport = async () => {
    try {
      await reportContent(uid, { contentId: reel.id, contentType: 'reel', reason: 'inappropriate', description: '' });
      toast.success('Reported — we\'ll review it soon');
      onClose();
    } catch { toast.error('Report failed'); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
    toast.success('Link copied');
    onClose();
  };

  const handleFollow = async () => {
    try {
      if (following) { await unfollowUser(uid, reel.authorId); setFollowing(false); }
      else { await followUser(uid, reel.authorId); setFollowing(true); }
      onClose();
    } catch { toast.error('Action failed'); }
  };

  const items = [
    !isOwnerOfReel && uid && { icon: following ? UserMinus : null, label: following ? 'Unfollow' : 'Follow', onClick: handleFollow, color: following ? 'var(--error-color)' : undefined },
    { icon: Link, label: 'Copy link', onClick: handleCopyLink },
    !isOwnerOfReel && uid && { icon: Flag, label: 'Report reel', onClick: handleReport, color: 'var(--error-color)' },
    (isOwnerOfReel || canModerate) && { icon: Trash2, label: 'Delete reel', onClick: handleDelete, color: 'var(--error-color)' },
  ].filter(Boolean);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 'var(--z-overlay, 1000)',
          backdropFilter: 'blur(4px)'
        }}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 'calc(var(--z-overlay, 1000) + 1)',
          background: 'var(--bg-secondary, #18181b)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '8px 0 calc(24px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ width: 36, height: 4, background: 'var(--border-strong, #444)', borderRadius: 2, margin: '6px auto 12px' }} />

        {items.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
            Log in to interact with this reel.
          </div>
        ) : items.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            style={{
              width: '100%', padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 15, fontWeight: 500,
              color: item.color || 'var(--text-primary)',
              background: 'none', border: 'none',
              borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              textAlign: 'left', cursor: 'pointer'
            }}
          >
            {item.icon && <item.icon size={20} />}
            {item.label}
          </button>
        ))}

        <button
          onClick={onClose}
          style={{
            width: 'calc(100% - 32px)', margin: '12px 16px 0',
            padding: '13px', borderRadius: 12,
            background: 'var(--surface-2)', fontSize: 15, fontWeight: 600,
            color: 'var(--text-primary)', border: 'none', cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </motion.div>
    </>
  );
}
