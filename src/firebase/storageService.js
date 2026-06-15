// src/firebase/storageService.js
// ALL storage goes to Cloudflare R2 via a Worker — zero Firebase Storage.
// Every file a user receives is also saved to IndexedDB locally for offline access.

import { v4 as uuidv4 } from 'uuid';
import { saveMediaBlob, getMediaBlob } from '../utils/localDB';

const R2_WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

const MAX_IMAGE_SIZE = 10  * 1024 * 1024;  // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;  // 500MB

// ── Core: upload file → R2 Worker ─────────────────────────────────────────────

export const uploadToR2 = (file, path, onProgress = null) => {
  if (!R2_WORKER_URL) throw new Error('VITE_R2_WORKER_URL is not set in .env');

  const ext      = (file.name || 'file').split('.').pop();
  const filename = `${uuidv4()}.${ext}`;
  const key      = `${path}/${filename}`;

  return new Promise((resolve, reject) => {
    const xhr  = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);
    form.append('key',  key);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        // Cache the blob locally so this file works offline immediately
        saveMediaBlob(res.url, file).catch(() => {});
        resolve({ url: res.url, path: key });
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    xhr.addEventListener('error',  () => reject(new Error('Network error')));
    xhr.addEventListener('abort',  () => reject(new Error('Upload aborted')));
    xhr.open('POST', `${R2_WORKER_URL}/upload`);
    xhr.send(form);
  });
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
  return uploadToR2(file, `profile-images/${uid}`, onProgress);
};

export const uploadCoverImage = (file, uid, onProgress) => {
  validateImage(file);
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Image must be under 10MB');
  return uploadToR2(file, `cover-images/${uid}`, onProgress);
};

export const uploadPostMedia = (file, uid, onProgress) => {
  if (file.type.startsWith('video/')) {
    validateVideo(file);
    if (file.size > MAX_VIDEO_SIZE) throw new Error('Video must be under 500MB');
    return uploadToR2(file, `post-videos/${uid}`, onProgress);
  }
  validateImage(file);
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Image must be under 10MB');
  return uploadToR2(file, `post-images/${uid}`, onProgress);
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
  return uploadToR2(file, `chat-images/${uid}`, onProgress);
};

export const uploadVoiceNote = (blob, uid, onProgress) => {
  const file = new File([blob], `voice-${uuidv4()}.webm`, { type: 'audio/webm' });
  return uploadToR2(file, `voice-notes/${uid}`, onProgress);
};

export const deleteFile = deleteFromR2;

// ── Validators ────────────────────────────────────────────────────────────────

export const validateImage = (file) => {
  const ok = ['image/jpeg','image/png','image/gif','image/webp'];
  if (!ok.includes(file.type)) throw new Error('Only JPEG, PNG, GIF, or WebP images are allowed');
  return true;
};

export const validateVideo = (file) => {
  const ok = ['video/mp4','video/webm','video/quicktime','video/x-msvideo'];
  if (!ok.includes(file.type)) throw new Error('Only MP4, WebM, MOV, or AVI videos are allowed');
  return true;
};
