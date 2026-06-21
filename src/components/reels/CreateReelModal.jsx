// src/components/reels/CreateReelModal.jsx
// Owner (sukesh._.official) can upload from local file without cloud storage.
// Everyone else uploads via Cloudinary/Firebase Storage as normal.
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Video, Loader2, HardDrive, Cloud, Image, Scissors } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { OWNER_USERNAMES } from '../../contexts/AuthContext';
import { createReel, createLocalReel } from '../../firebase/firestoreService';
import { uploadReelVideo, uploadReelThumbnail } from '../../firebase/storageService';
import { saveLocalReelVideo } from '../../utils/localDB';
import toast from 'react-hot-toast';

export default function CreateReelModal({ onClose }) {
  const { uid, userProfile } = useAuth();
  const isOwner = OWNER_USERNAMES.includes(userProfile?.username);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  // Owner mode: 'cloud' uses normal upload, 'local' stores blob URL in Firestore
  const [uploadMode, setUploadMode] = useState('cloud');
  const [thumbnailTime, setThumbnailTime] = useState(0);
  const [customThumbnail, setCustomThumbnail] = useState(null); // File
  const [thumbnailPreview, setThumbnailPreview] = useState(null); // URL
  const [videoDuration, setVideoDuration] = useState(0);
  const previewVideoRef = useRef();
  const thumbFileRef = useRef();
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) { toast.error('Please select a video file'); return; }
    const url = URL.createObjectURL(f);
    const vid = document.createElement('video');
    vid.src = url;
    vid.onloadedmetadata = () => {
      setFile(f);
      setPreview(url);
      setVideoDuration(vid.duration || 0);
      setThumbnailTime(0);
      setStep(1);
    };
    vid.onerror = () => { toast.error('Could not read video file'); URL.revokeObjectURL(url); };
  };

  const handleSubmit = async () => {
    if (!uid || !file || uploading) return;
    setUploading(true);
    try {
      if (isOwner && uploadMode === 'local') {
        // Save the actual File blob to IndexedDB first, get Firestore ID back
        const reelId = await createLocalReel(uid, {
          videoUrl: '', // placeholder; resolved from IndexedDB on playback
          localFile: true,
          title: title.trim(),
          caption: caption.trim(),
        });
        // Store the actual video File in IndexedDB keyed by reelId
        await saveLocalReelVideo(reelId, file);
        toast.success('Reel saved from local file!');
      } else {
        // Standard upload to cloud storage
        const result = await uploadReelVideo(file, uid, (p) => setProgress(p));

        // BUGFIX: previously only `thumbnailTime` was saved here, and nothing
        // in the app ever actually read `thumbnailTime` either — every grid
        // (HomeReels, ProfilePage, SavedReelsPage) renders `reel.thumbnailUrl`
        // when present. If the user picked a custom cover image, the UI
        // showed "✓ Custom thumbnail set" (so it looked saved) but the file
        // was never uploaded or written anywhere — silently discarded on
        // submit, so the grid always fell back to a raw <video> first frame.
        let thumbnailUrl = null;
        if (customThumbnail) {
          try {
            const thumbResult = await uploadReelThumbnail(customThumbnail, uid);
            thumbnailUrl = thumbResult.url;
          } catch (e) {
            // Don't fail the whole reel upload over a cover image — the video
            // itself already succeeded; the grid just falls back to <video>.
            console.warn('Custom thumbnail upload failed, falling back to video frame:', e.message);
            toast.error('Cover image failed to upload — used the video frame instead');
          }
        }

        await createReel(uid, {
          videoUrl: result.url,
          videoPath: result.path,
          title: title.trim(),
          caption: caption.trim(),
          thumbnailTime: thumbnailTime,
          thumbnailUrl, // null unless a cover image was picked AND uploaded successfully
        });
        toast.success('Reel shared!');
      }
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
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 'var(--z-modal)', backdropFilter: 'blur(8px)' }}
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>New Reel</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Owner upload mode picker */}
        {isOwner && step === 0 && (
          <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8 }}>
            <ModeBtn active={uploadMode === 'cloud'} onClick={() => setUploadMode('cloud')} icon={<Cloud size={14} />} label="Cloud Upload" />
            <ModeBtn active={uploadMode === 'local'} onClick={() => setUploadMode('local')} icon={<HardDrive size={14} />} label="Local File (Owner)" />
          </div>
        )}

        {/* Step 0: Pick file */}
        {step === 0 && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 44, cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-xl)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isOwner && uploadMode === 'local'
                ? <HardDrive size={26} style={{ color: 'var(--text-tertiary)' }} />
                : <Video size={26} style={{ color: 'var(--text-tertiary)' }} />
              }
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {isOwner && uploadMode === 'local' ? 'Pick from your device' : 'Upload a video'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {isOwner && uploadMode === 'local'
                  ? 'MP4, WebM, MOV — plays from your local file (no cloud cost)'
                  : 'Any size · MP4, WebM, MOV · Uploaded to cloud storage'
                }
              </p>
            </div>
            <button style={{ padding: '9px 22px', borderRadius: 'var(--radius-full)', background: 'var(--brand-gradient)', color: 'white', fontSize: 13, fontWeight: 600 }}>
              Select video
            </button>
            <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        )}

        {/* Step 1: Caption + submit */}
        {step === 1 && (
          <div>
            {preview && (
              <div style={{ position: 'relative', background: '#000', overflow: 'hidden' }}>
                {/* Video preview with timeline */}
                <video
                  ref={previewVideoRef}
                  src={preview}
                  muted
                  playsInline
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                  onLoadedMetadata={e => setVideoDuration(e.target.duration || 0)}
                />
                {/* Timeline for thumbnail selection */}
                {videoDuration > 0 && (
                  <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.7)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>📸 Thumbnail frame</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{Math.round(thumbnailTime)}s / {Math.round(videoDuration)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={videoDuration}
                      step={0.1}
                      value={thumbnailTime}
                      onChange={e => {
                        const t = parseFloat(e.target.value);
                        setThumbnailTime(t);
                        if (previewVideoRef.current) previewVideoRef.current.currentTime = t;
                      }}
                      style={{ width: '100%', accentColor: '#7C3AED', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button
                        onClick={() => thumbFileRef.current?.click()}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Image size={11} /> Custom cover
                      </button>
                      {thumbnailPreview && (
                        <span style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Custom thumbnail set</span>
                      )}
                    </div>
                    <input ref={thumbFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => {
                        const img = e.target.files?.[0];
                        if (img) { setCustomThumbnail(img); setThumbnailPreview(URL.createObjectURL(img)); }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isOwner && uploadMode === 'local' && (
                <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Local file mode — video plays from your device. Other users will not see it unless you switch to cloud upload.
                </div>
              )}
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Add a title..."
                maxLength={100}
                style={{ width: '100%', padding: '11px 13px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14 }}
              />
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption..."
                rows={3}
                maxLength={2200}
                style={{ width: '100%', padding: '11px 13px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, resize: 'none' }}
              />
              {uploading && uploadMode === 'cloud' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>Uploading...</span><span>{progress}%</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border-default)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--brand-gradient)', width: `${progress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setStep(0)}
                  disabled={uploading}
                  style={{ flex: 1, padding: '12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  style={{ flex: 2, padding: '12px', background: 'var(--brand-gradient)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: uploading ? 0.7 : 1 }}
                >
                  {uploading ? <><Loader2 size={15} className="animate-spin" /> Uploading...</> : 'Share Reel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

const ModeBtn = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
      background: active ? 'var(--brand-gradient)' : 'var(--surface-3)',
      color: active ? 'white' : 'var(--text-secondary)',
      border: 'none', transition: 'all 0.15s'
    }}
  >
    {icon} {label}
  </button>
);
