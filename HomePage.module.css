// src/components/feed/StoryBar.jsx — Instagram-style story/note circles
import { useState, useEffect } from 'react';
import { Plus, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { createNote, getActiveNotes, getFollowing, getUserByUid } from '../../firebase/firestoreService';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function StoryBar() {
  const { uid, userProfile } = useAuth();
  const [notes, setNotes] = useState([]);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteMusic, setNoteMusic] = useState('');

  useEffect(() => {
    if (!uid) return;
    loadNotes();
  }, [uid]);

  const loadNotes = async () => {
    try {
      const followingIds = await getFollowing(uid, 50);
      const allIds = [uid, ...followingIds];
      const activeNotes = await getActiveNotes(allIds);
      const enriched = await Promise.all(
        activeNotes.map(async n => ({
          ...n,
          author: await getUserByUid(n.authorId)
        }))
      );
      setNotes(enriched);
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
  };

  const handleCreateNote = async () => {
    if (!noteText.trim()) return;
    try {
      await createNote(uid, noteText.trim());
      setNoteText('');
      setNoteMusic('');
      setShowNoteInput(false);
      toast.success('Note posted — visible for 24h');
      loadNotes();
    } catch {
      toast.error('Failed to post note');
    }
  };

  // Your own note if exists
  const myNote = notes.find(n => n.authorId === uid);
  const otherNotes = notes.filter(n => n.authorId !== uid);

  return (
    <div style={{
      background: 'var(--surface-1)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        padding: '12px 14px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {/* Your story/note circle */}
        <StoryCircle
          isAdd
          photo={userProfile?.profilePhoto}
          name={userProfile?.displayName}
          note={myNote?.text}
          onClick={() => setShowNoteInput(true)}
        />

        {/* Other users' notes as story circles */}
        {otherNotes.map(note => (
          <StoryCircle
            key={note.id}
            photo={note.author?.profilePhoto}
            name={note.author?.displayName?.split(' ')[0] || note.author?.username}
            note={note.text}
            verified={note.author?.verified}
          />
        ))}
      </div>

      {/* Note input modal */}
      <AnimatePresence>
        {showNoteInput && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNoteInput(false)}
              style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 'var(--z-overlay)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              style={{
                position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 70px)',
                left: '50%', transform: 'translateX(-50%)',
                zIndex: 'calc(var(--z-overlay) + 1)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                padding: 20, width: 'min(380px, calc(100vw - 24px))',
                boxShadow: 'var(--modal-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Avatar src={userProfile?.profilePhoto} name={userProfile?.displayName} size={38} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{userProfile?.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Note lasts 24 hours</div>
                </div>
              </div>

              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value.slice(0, 60))}
                placeholder="Share a thought…"
                rows={3}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                  fontSize: 15, resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{noteText.length}/60</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Music size={11} /> Music coming soon
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowNoteInput(false)}
                  style={{
                    flex: 1, padding: '11px', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
                    color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNote}
                  disabled={!noteText.trim()}
                  style={{
                    flex: 1.5, padding: '11px', borderRadius: 'var(--radius-md)',
                    background: noteText.trim() ? 'var(--brand-gradient)' : 'var(--surface-3)',
                    color: noteText.trim() ? 'white' : 'var(--text-disabled)',
                    fontSize: 14, fontWeight: 700, border: 'none', cursor: noteText.trim() ? 'pointer' : 'default',
                  }}
                >
                  Share Note
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Instagram-style story circle with note bubble above
const StoryCircle = ({ photo, name, note, isAdd, onClick, verified }) => {
  const [showNote, setShowNote] = useState(false);
  const truncated = note ? (note.length > 24 ? note.slice(0, 24) + '…' : note) : null;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}
      onClick={onClick || (() => note && setShowNote(s => !s))}
    >
      <div style={{ position: 'relative' }}>
        {/* Gradient ring — Instagram style */}
        <div style={{
          width: 66, height: 66, borderRadius: '50%',
          background: isAdd
            ? 'var(--surface-3)'
            : (note ? 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' : 'var(--border-default)'),
          padding: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%',
            background: 'var(--bg-primary)',
            padding: 2, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Avatar src={photo} name={name} size={58} />
          </div>
        </div>

        {/* Note bubble above avatar */}
        {truncated && (
          <div style={{
            position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '3px 8px',
            fontSize: 10, fontWeight: 500, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}>
            {truncated}
          </div>
        )}

        {/* Add button */}
        {isAdd && (
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--brand-primary)',
            border: '2px solid var(--bg-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={12} color="white" />
          </div>
        )}

        {/* Verified badge */}
        {verified && !isAdd && (
          <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
              <path d="M20 2 L23.5 7.5 L30 6 L29.5 12.5 L36 15 L33 21 L38 26 L32.5 29.5 L33 36 L26.5 35 L24 41 L20 37.5 L16 41 L13.5 35 L7 36 L7.5 29.5 L2 26 L7 21 L4 15 L10.5 12.5 L10 6 L16.5 7.5 Z" fill="#1877F2"/>
              <path d="M13.5 20.5 L18 25.5 L27 15" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      <span style={{
        fontSize: 11, color: 'var(--text-secondary)',
        maxWidth: 66, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', textAlign: 'center',
      }}>
        {isAdd ? 'Your note' : name}
      </span>
    </div>
  );
};
