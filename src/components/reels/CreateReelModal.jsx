// src/components/reels/CreateReelModal.jsx
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Video, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createReel } from '../../firebase/firestoreService';
import { uploadReelVideo } from '../../firebase/storageService';
import toast from 'react-hot-toast';

export default function CreateReelModal({ onClose }) {
  const { uid } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) { toast.error('Please select a video'); return; }
    if (f.size > 100 * 1024 * 1024) { toast.error('Video must be under 100MB'); return; }

    // Check duration
    const url = URL.createObjectURL(f);
    const vid = document.createElement('video');
    vid.src = url;
    vid.onloadedmetadata = () => {
      if (vid.duration > 120) { toast.error('Reel max duration is 2 minutes'); URL.revokeObjectURL(url); return; }
      setFile(f);
      setPreview(url);
      setStep(1);
    };
  };

  const handleSubmit = async () => {
    if (!uid || !file || uploading) return;
    setUploading(true);
    try {
      const result = await uploadReelVideo(file, uid, setProgress);
      await createReel(uid, {
        videoUrl: result.url,
        videoPath: result.path,
        title: title.trim(),
        caption: caption.trim()
      });
      toast.success('Reel shared! 🎬');
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to share reel');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={!uploading ? onClose : undefined}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 'var(--z-modal)', backdropFilter: 'blur(8px)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 'calc(var(--z-modal) + 1)',
          width: 'min(480px, calc(100vw - 32px))',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          overflow: 'hidden', boxShadow: 'var(--modal-shadow)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>New Reel</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {step === 0 ? (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: 48, cursor: 'pointer', textAlign: 'center'
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Upload a video</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Max 2 minutes · MP4, WebM, MOV</p>
            </div>
            <button style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: 'var(--brand-gradient)', color: 'white', fontSize: 14, fontWeight: 600 }}>
              Select video
            </button>
            <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        ) : (
          <div>
            {preview && (
              <div style={{ position: 'relative', background: '#000', aspectRatio: '9/16', maxHeight: 280, overflow: 'hidden' }}>
                <video src={preview} controls muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Reel title…"
                maxLength={100}
                style={{ width: '100%', padding: '11px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14 }}
              />
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption…"
                rows={3}
                maxLength={2200}
                style={{ width: '100%', padding: '11px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, resize: 'none' }}
              />
              {uploading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Uploading…</span><span>{progress}%</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border-default)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--brand-gradient)', width: `${progress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={uploading}
                style={{ width: '100%', padding: '13px', background: 'var(--brand-gradient)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : 'Share Reel 🎬'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
