// src/utils/cloudinaryDownload.js
// Builds a Cloudinary delivery URL with an on-the-fly transformation that:
//   1. Adjusts quality (same / lowest) per the user's Settings preference
//   2. Burns in a small "UChat @creator" text watermark
//   3. Forces a real file download (fl_attachment) instead of opening inline
// Cloudinary renders all of this server-side — no client-side video
// processing (e.g. ffmpeg.wasm) needed, since the source is already hosted there.

const escapeForCloudinaryText = (text) =>
  encodeURIComponent(text).replace(/%2F/g, '\u2215').replace(/,/g, '%2C');

export const getDownloadQualityPref = () => localStorage.getItem('uchat_download_quality') || 'same';
export const setDownloadQualityPref = (v) => localStorage.setItem('uchat_download_quality', v);

export const buildWatermarkedDownloadUrl = (videoUrl, creatorUsername, quality = 'same') => {
  if (!videoUrl || !videoUrl.includes('/upload/')) return videoUrl; // not a Cloudinary URL — fall back to plain link

  const label = escapeForCloudinaryText(`UChat @${creatorUsername || 'creator'}`);
  const qualityParam = quality === 'lowest' ? 'q_auto:low' : 'q_auto:good';

  const transformations = [
    qualityParam,
    `l_text:Arial_28_bold:${label},co_white,b_rgb:00000099,g_south_east,x_18,y_18`,
    'fl_layer_apply',
    'fl_attachment',
  ].join('/');

  return videoUrl.replace('/upload/', `/upload/${transformations}/`);
};

export const triggerDownload = (url, filename = 'uchat-reel.mp4') => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ─── Data Saver (Settings → Data usage and media quality) ─────────────────────
// When enabled, Cloudinary media is requested at a lower bitrate/resolution
// via an on-the-fly transformation — same source file, smaller delivery.
export const getDataSaverEnabled = () => localStorage.getItem('uchat_data_saver') === '1';
export const setDataSaverEnabled = (v) => localStorage.setItem('uchat_data_saver', v ? '1' : '0');

export const applyDataSaverTransform = (url) => {
  if (!url || !getDataSaverEnabled() || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/q_auto:eco/');
};
