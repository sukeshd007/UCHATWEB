// src/components/posts/PostMenu.jsx
import { motion } from 'framer-motion';
import { Trash2, Flag, Link, UserMinus, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { deletePost, reportContent, followUser, unfollowUser, isFollowing } from '../../firebase/firestoreService';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

export default function PostMenu({ post, author, onClose }) {
  const { uid, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);
  const isOwnerOfPost = post.authorId === uid;
  const canModerate = isAdmin || isOwner;

  useEffect(() => {
    if (uid && !isOwnerOfPost) isFollowing(uid, post.authorId).then(setFollowing);
  }, [uid, post.authorId]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(post.id, post.authorId);
      toast.success('Post deleted');
      onClose();
      navigate('/');
    } catch { toast.error('Delete failed'); }
  };

  const handleReport = async () => {
    try {
      await reportContent(uid, { contentId: post.id, contentType: 'post', reason: 'inappropriate', description: '' });
      toast.success('Reported — we\'ll review it soon');
      onClose();
    } catch { toast.error('Report failed'); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success('Link copied');
    onClose();
  };

  const handleFollow = async () => {
    try {
      if (following) { await unfollowUser(uid, post.authorId); setFollowing(false); }
      else { await followUser(uid, post.authorId); setFollowing(true); }
      onClose();
    } catch { toast.error('Action failed'); }
  };

  const items = [
    !isOwnerOfPost && { icon: following ? UserMinus : null, label: following ? 'Unfollow' : 'Follow', onClick: handleFollow, color: following ? 'var(--error-color)' : undefined },
    { icon: Link, label: 'Copy link', onClick: handleCopyLink },
    !isOwnerOfPost && { icon: Flag, label: 'Report post', onClick: handleReport, color: 'var(--error-color)' },
    (isOwnerOfPost || canModerate) && { icon: Trash2, label: 'Delete post', onClick: handleDelete, color: 'var(--error-color)' },
  ].filter(Boolean);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg-overlay)',
          zIndex: 'var(--z-overlay)',
          backdropFilter: 'blur(4px)'
        }}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 'calc(var(--z-overlay) + 1)',
          background: 'var(--bg-secondary)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '8px 0 calc(24px + env(safe-area-inset-bottom))',
          boxShadow: 'var(--modal-shadow)'
        }}
      >
        <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '6px auto 12px' }} />

        {items.map((item, i) => item && (
          <button
            key={i}
            onClick={item.onClick}
            style={{
              width: '100%', padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 15, fontWeight: 500,
              color: item.color || 'var(--text-primary)',
              borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              textAlign: 'left'
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
            padding: '13px', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)', fontSize: 15, fontWeight: 600,
            color: 'var(--text-primary)'
          }}
        >
          Cancel
        </button>
      </motion.div>
    </>
  );
}
