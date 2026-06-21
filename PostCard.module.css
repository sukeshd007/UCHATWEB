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

// ── Cloudinary multi-account rotation ─────────────────────────────────────────
// Each Cloudinary free account gives ~25GB storage. Spreading uploads across
// multiple accounts gives ~25GB × N effective capacity. Only cloud name +
// UNSIGNED upload preset name are needed here — never an API key/secret,
// since unsigned uploads don't require auth and secrets must never ship in
// frontend code (Vite bundles all VITE_-prefixed vars into the public JS).
//
// Configure via .env (see .env.example) — accounts 2-4 are optional; if unset,
// rotation simply runs on however many accounts ARE configured.
const buildAccountList = () => {
  const accounts = [];
  for (let i = 1; i <= 4; i++) {
    const cloudName = import.meta.env[`VITE_CLOUDINARY_CLOUD_NAME_${i}`];
    const preset = import.meta.env[`VITE_CLOUDINARY_UPLOAD_PRESET_${i}`];
    if (cloudName && preset) accounts.push({ cloudName, preset });
  }
  // Back-compat: if no numbered accounts are set, fall back to the original
  // single-account env vars (or the hardcoded default) as account #1.
  if (accounts.length === 0) {
    accounts.push({ cloudName: CLOUDINARY_CLOUD_NAME, preset: CLOUDINARY_UPLOAD_PRESET });
  }
  return accounts;
};
const CLOUDINARY_ACCOUNTS = buildAccountList();

const ROTATION_KEY = 'uchat_cloudinary_rotation_idx';
const getNextAccountIndex = () => {
  const current = parseInt(localStorage.getItem(ROTATION_KEY) || '0', 10) || 0;
  const next = (current + 1) % CLOUDINARY_ACCOUNTS.length;
  localStorage.setItem(ROTATION_KEY, String(next));
  return current;
};

// Errors that indicate "this account is out of room / rate-limited" — worth
// retrying on the next account rather than failing the whole upload.
const isQuotaError = (status, message = '') => {
  if (status === 420 || status === 429) return true; // Cloudinary rate-limit / plan-limit codes
  const m = message.toLowerCase();
  return m.includes('limit') || m.includes('quota') || m.includes('insufficient') || m.includes('exceeded');
};

const uploadToCloudinaryAccount = (file, folder, account, onProgress) => {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', account.preset);
    form.append('folder', folder);
    form.append('public_id', uuidv4());

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        const url = res.secure_url;
        saveMediaBlob(url, file).catch(() => {});
        resolve({ url, path: res.public_id });
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err?.error?.message) msg = err.error.message;
        } catch {}
        const error = new Error(msg);
        error.status = xhr.status;
        reject(error);
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${account.cloudName}/auto/upload`);
    xhr.send(form);
  });
};

// Tries accounts in round-robin order (spreading load evenly across all
// configured accounts), and automatically fails over to the next account if
// the current one reports a quota/limit error — so one maxed-out 25GB
// account doesn't block uploads while the others still have room.
const uploadToCloudinaryRotated = async (file, folder, onProgress = null) => {
  if (CLOUDINARY_ACCOUNTS.length === 0) {
    throw new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME_1 and VITE_CLOUDINARY_UPLOAD_PRESET_1 to your .env file.');
  }
  const startIdx = getNextAccountIndex();
  let lastError;
  for (let attempt = 0; attempt < CLOUDINARY_ACCOUNTS.length; attempt++) {
    const idx = (startIdx + attempt) % CLOUDINARY_ACCOUNTS.length;
    const account = CLOUDINARY_ACCOUNTS[idx];
    try {
      return await uploadToCloudinaryAccount(file, folder, account, onProgress);
    } catch (err) {
      lastError = err;
      if (!isQuotaError(err.status, err.message)) throw err; // real error, don't retry other accounts
      console.warn(`Cloudinary account ${account.cloudName} unavailable (${err.message}), trying next account…`);
    }
  }
  throw lastError || new Error('All Cloudinary accounts failed');
};

// ── Cloudinary upload ─────────────────────────────────────────────────────────
// Uses an unsigned upload preset — no backend needed, completely free.
// Sign up at cloudinary.com → Settings → Upload → Add upload preset → Unsigned.
const uploadToCloudinary = (file, folder, onProgress = null) => uploadToCloudinaryRotated(file, folder, onProgress);

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
