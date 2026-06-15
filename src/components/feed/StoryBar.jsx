// src/components/feed/StoryBar.jsx
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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
      setShowNoteInput(false);
      toast.success('Note posted — visible for 24h');
      loadNotes();
    } catch {
      toast.error('Failed to post note');
    }
  };

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        gap: 16,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none'
      }}>
        {/* Add note button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setShowNoteInput(true)}
            style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative'
            }}
          >
            <Avatar src={userProfile?.profilePhoto} name={userProfile?.displayName} size={56} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--brand-primary)',
              border: '2px solid var(--bg-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Plus size={12} color="white" />
            </div>
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Add note
          </span>
        </div>

        {/* Notes */}
        {notes.map(note => (
          <NoteItem key={note.id} note={note} />
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
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 'calc(var(--z-overlay) + 1)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                padding: 24, width: 'min(360px, calc(100vw - 32px))',
                boxShadow: 'var(--modal-shadow)'
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New Note</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Notes disappear after 24 hours.
              </p>
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value.slice(0, 60))}
                placeholder="What's on your mind?"
                rows={3}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                  fontSize: 15, resize: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{noteText.length}/60</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => setShowNoteInput(false)}
                  style={{ flex: 1, padding: '11px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNote}
                  disabled={!noteText.trim()}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 'var(--radius-md)',
                    background: noteText.trim() ? 'var(--brand-gradient)' : 'var(--surface-3)',
                    color: noteText.trim() ? 'white' : 'var(--text-disabled)',
                    fontSize: 14, fontWeight: 600
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

const NoteItem = ({ note }) => {
  const [showFull, setShowFull] = useState(false);
  const truncated = note.text.length > 28 ? note.text.slice(0, 28) + '…' : note.text;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowFull(s => !s)}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'var(--brand-gradient)',
          padding: 2
        }}>
          <div style={{ borderRadius: '50%', overflow: 'hidden', width: '100%', height: '100%', background: 'var(--bg-primary)', padding: 2 }}>
            <Avatar src={note.author?.profilePhoto} name={note.author?.displayName} size={52} />
          </div>
        </div>
        {/* Note bubble */}
        {!showFull && (
          <div style={{
            position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '3px 8px',
            fontSize: 10, fontWeight: 500, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            {truncated}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {note.author?.displayName?.split(' ')[0]}
      </span>
    </div>
  );
};
