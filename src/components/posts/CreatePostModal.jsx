// src/components/posts/CreatePostModal.jsx
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ImagePlus, MapPin, Hash, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPost } from '../../firebase/firestoreService';
import { uploadPostMedia } from '../../firebase/storageService';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

const STEPS = ['media', 'details'];

export default function CreatePostModal({ onClose }) {
  const { uid, userProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).slice(0, 10);
    if (!selected.length) return;
    setFiles(selected);
    const urls = selected.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    setStep(1);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    ).slice(0, 10);
    if (!dropped.length) return;
    setFiles(dropped);
    setPreviews(dropped.map(f => URL.createObjectURL(f)));
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!uid || uploading) return;
    setUploading(true);

    try {
      const mediaUrls = [];
      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        const result = await uploadPostMedia(files[i], uid, (p) => {
          setProgress(Math.round(((i / total) + p / 100 / total) * 100));
        });
        mediaUrls.push(result.url);
      }

      const tags = hashtags
        .split(/[\s,#]+/)
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      await createPost(uid, {
        mediaUrls,
        mediaType: files[0]?.type?.startsWith('video/') ? 'video' : 'image',
        caption: caption.trim(),
        location: location.trim(),
        hashtags: tags,
      });

      toast.success('Post shared! 🎉');
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to share post');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={!uploading ? onClose : undefined}
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg-overlay)',
          zIndex: 'var(--z-modal)',
          backdropFilter: 'blur(8px)'
        }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 'calc(var(--z-modal) + 1)',
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: '90dvh',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--modal-shadow)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0
        }}>
          {step > 0 && !uploading ? (
            <button onClick={() => setStep(0)} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
              <ChevronLeft size={18} /> Back
            </button>
          ) : <div />}
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>
            {step === 0 ? 'Create Post' : 'Add Details'}
          </h3>
          {step < 1 ? (
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={uploading}
              style={{
                padding: '6px 16px', borderRadius: 'var(--radius-full)',
                background: 'var(--brand-gradient)', color: 'white',
                fontSize: 14, fontWeight: 600,
                opacity: uploading ? 0.7 : 1
              }}
            >
              {uploading ? 'Sharing…' : 'Share'}
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {step === 0 ? (
            /* Media picker */
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16, padding: 48,
                minHeight: 280,
                border: '2px dashed var(--border-default)',
                margin: 20, borderRadius: 'var(--radius-xl)',
                cursor: 'pointer', textAlign: 'center'
              }}
              onClick={() => fileRef.current?.click()}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ImagePlus size={28} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                  Drag photos & videos here
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  Up to 10 files · Max 10MB per image, 100MB per video
                </p>
              </div>
              <button style={{
                padding: '10px 24px', borderRadius: 'var(--radius-full)',
                background: 'var(--brand-gradient)', color: 'white',
                fontSize: 14, fontWeight: 600
              }}>
                Select from device
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFiles}
              />
            </div>
          ) : (
            /* Details form */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Preview */}
              <div style={{
                display: 'flex', gap: 4, overflowX: 'auto',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                {previews.map((url, i) => (
                  <div key={i} style={{
                    width: 80, height: 80, flexShrink: 0,
                    borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)'
                  }}>
                    {files[i]?.type?.startsWith('video/') ? (
                      <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Form fields */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar src={userProfile?.profilePhoto} name={userProfile?.displayName} size={36} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{userProfile?.displayName}</span>
                </div>

                {/* Caption */}
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Write a caption…"
                  rows={4}
                  maxLength={2200}
                  style={{
                    width: '100%', padding: 12,
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 14, resize: 'none', lineHeight: 1.6
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                  {caption.length}/2200
                </span>

                {/* Location */}
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-tertiary)'
                  }} />
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Add location"
                    style={{
                      width: '100%', padding: '11px 12px 11px 36px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)', fontSize: 14
                    }}
                  />
                </div>

                {/* Hashtags */}
                <div style={{ position: 'relative' }}>
                  <Hash size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-tertiary)'
                  }} />
                  <input
                    value={hashtags}
                    onChange={e => setHashtags(e.target.value)}
                    placeholder="Add hashtags (space or comma separated)"
                    style={{
                      width: '100%', padding: '11px 12px 11px 36px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)', fontSize: 14
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 3, background: 'var(--border-default)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'var(--brand-gradient)',
                width: `${progress}%`, transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
