// src/firebase/storageService.js
// Images (profile, cover, posts, chat) → Cloudinary (free 25GB, no card needed).
// Videos → Cloudflare R2 via Worker (only if VITE_R2_WORKER_URL is set),
//           otherwise falls back to Cloudinary too.

import { v4 as uuidv4 } from 'uuid';
import { saveMediaBlob } from '../utils/localDB';

// Cloudinary public credentials — safe to hardcode (no secret here).
// NEVER put your API Secret in frontend code.
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dx7y006wj';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'uchat_uploads';
const R2_WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

const MAX_IMAGE_SIZE = 10  * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

// ── Cloudinary upload ─────────────────────────────────────────────────────────
// Uses an unsigned upload preset — no backend needed, completely free.
// Sign up at cloudinary.com → Settings → Upload → Add upload preset → Unsigned.
const uploadToCloudinary = (file, folder, onProgress = null) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return Promise.reject(
      new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.')
    );
  }

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    form.append('folder', folder);
    // Give every file a unique public_id so overwrites don't clash
    form.append('public_id', uuidv4());

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        const url = res.secure_url; // always HTTPS
        saveMediaBlob(url, file).catch(() => {});
        resolve({ url, path: res.public_id });
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err?.error?.message) msg = err.error.message;
        } catch {}
        reject(new Error(msg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
    xhr.send(form);
  });
};

// ── Cloudflare R2 upload (optional, for large videos) ────────────────────────
const uploadToR2 = (file, path, onProgress = null) => {
  if (!R2_WORKER_URL) {
    // R2 not set up — use Cloudinary as fallback
    return uploadToCloudinary(file, path, onProgress);
  }

  const ext      = (file.name || 'file').split('.').pop();
  const filename = `${uuidv4()}.${ext}`;
  const key      = `${path}/${filename}`;

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('key', key);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        saveMediaBlob(res.url, file).catch(() => {});
        resolve({ url: res.url, path: key });
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `${R2_WORKER_URL}/upload`);
    xhr.send(form);
  });
};

// ── Delete helpers ────────────────────────────────────────────────────────────
// Cloudinary deletes require a signed request (server-side). For a client-only
// app, skip deletion or handle it via a Cloud Function later.
export const deleteFile = async (publicId) => {
  // No-op on client side for Cloudinary — implement via Cloud Function if needed
  console.log('deleteFile: skipped (Cloudinary requires server-side delete)', publicId);
};

export const deleteFromR2 = async (key) => {
  if (!R2_WORKER_URL) return;
  try {
    await fetch(`${R2_WORKER_URL}/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
  } catch (e) {
    console.warn('R2 delete failed:', e.message);
  }
};

// ── Typed upload helpers ───────────────────────────────────────────────────────

export const uploadProfileImage = (file, uid, onProgress) => {
  validateImage(file);
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Image must be under 10MB');
  return uploadToCloudinary(file, `uchat/profile-images/${uid}`, onProgress);
};

export const uploadCoverImage = (file, uid, onProgress) => {
  validateImage(file);
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Image must be under 10MB');
  return uploadToCloudinary(file, `uchat/cover-images/${uid}`, onProgress);
};

export const uploadPostMedia = (file, uid, onProgress) => {
  if (file.type.startsWith('video/')) {
    validateVideo(file);
    if (file.size > MAX_VIDEO_SIZE) throw new Error('Video must be under 500MB');
    return uploadToR2(file, `post-videos/${uid}`, onProgress);
  }
  validateImage(file);
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Image must be under 10MB');
  return uploadToCloudinary(file, `uchat/post-images/${uid}`, onProgress);
};

export const uploadReelVideo = (file, uid, onProgress) => {
  validateVideo(file);
  if (file.size > MAX_VIDEO_SIZE) throw new Error('Reel must be under 500MB');
  return uploadToR2(file, `reel-videos/${uid}`, onProgress);
};

export const uploadChatMedia = (file, uid, onProgress) => {
  if (file.type.startsWith('video/')) {
    validateVideo(file);
    return uploadToR2(file, `chat-videos/${uid}`, onProgress);
  }
  validateImage(file);
  return uploadToCloudinary(file, `uchat/chat-images/${uid}`, onProgress);
};

export const uploadVoiceNote = (blob, uid, onProgress) => {
  const file = new File([blob], `voice-${uuidv4()}.webm`, { type: 'audio/webm' });
  return uploadToR2(file, `voice-notes/${uid}`, onProgress);
};

// ── Validators ────────────────────────────────────────────────────────────────

export const validateImage = (file) => {
  const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!ok.includes(file.type)) throw new Error('Only JPEG, PNG, GIF, or WebP images are allowed');
  return true;
};

export const validateVideo = (file) => {
  const ok = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  if (!ok.includes(file.type)) throw new Error('Only MP4, WebM, MOV, or AVI videos are allowed');
  return true;
};
