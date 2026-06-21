// src/components/posts/CommentSheet.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { addComment, getComments, getUserByUid, deleteComment } from '../../firebase/firestoreService';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function CommentSheet({ post, onClose, contentType = 'post' }) {
  const { uid, userProfile, isAdmin } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    loadComments();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [post.id]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const result = await getComments(post.id);
      // Enrich with author data
      const enriched = await Promise.all(
        result.comments.map(async c => ({
          ...c,
          author: await getUserByUid(c.authorId)
        }))
      );
      setComments(enriched);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !uid || submitting) return;
    setSubmitting(true);
    try {
      await addComment(uid, post.id, text.trim(), post.authorId, contentType);
      setText('');
      loadComments();
    } catch (e) {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId, post.id, contentType);
      setComments(cs => cs.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg-overlay)',
          zIndex: 'var(--z-overlay)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 'calc(var(--z-overlay) + 1)',
          background: 'var(--bg-secondary)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          maxHeight: '80dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--modal-shadow)'
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, background: 'var(--border-strong)',
          borderRadius: 2, margin: '10px auto 0', flexShrink: 0
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Comments</h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
              No comments yet. Be the first!
            </div>
          ) : (
            comments.map(comment => (
              <CommentRow
                key={comment.id}
                comment={comment}
                uid={uid}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Input */}
        {uid && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            borderTop: '1px solid var(--border-subtle)',
            paddingBottom: `calc(10px + env(safe-area-inset-bottom))`,
            flexShrink: 0
          }}>
            <Avatar src={userProfile?.profilePhoto} name={userProfile?.displayName} size={32} />
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
                placeholder="Add a comment…"
                style={{
                  width: '100%', padding: '10px 44px 10px 14px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-primary)',
                  fontSize: 14
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                style={{
                  position: 'absolute', right: 6, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: '50%',
                  background: text.trim() ? 'var(--brand-gradient)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: text.trim() ? 'white' : 'var(--text-disabled)',
                  transition: 'all 0.2s'
                }}
              >
                {submitting
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Send size={14} />
                }
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

const CommentRow = ({ comment, uid, isAdmin, onDelete }) => {
  const canDelete = comment.authorId === uid || isAdmin;
  const ts = comment.createdAt?.toDate
    ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })
    : 'just now';

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '8px 16px',
      alignItems: 'flex-start'
    }}>
      <Avatar
        src={comment.author?.profilePhoto}
        name={comment.author?.displayName}
        size={32}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: '0 var(--radius-md) var(--radius-md) var(--radius-md)',
          padding: '8px 12px'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, marginRight: 6 }}>
            {comment.author?.displayName}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {comment.text}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ts}</span>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              style={{ fontSize: 11, color: 'var(--error-color)', fontWeight: 500 }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
