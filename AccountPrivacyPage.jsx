// src/utils/localDB.js
// IndexedDB wrapper — stores messages, media blobs, and user data locally.
// Everything a user receives is saved here so the app works fully offline.

const DB_NAME = 'uchat-local';
const DB_VERSION = 4; // bumped: added localReelVideos store

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('messages')) {
        const ms = db.createObjectStore('messages', { keyPath: 'id' });
        ms.createIndex('chatId', 'chatId', { unique: false });
        ms.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('media'))   db.createObjectStore('media',   { keyPath: 'key' });
      if (!db.objectStoreNames.contains('chats'))   db.createObjectStore('chats',   { keyPath: 'id' });
      if (!db.objectStoreNames.contains('users'))   db.createObjectStore('users',   { keyPath: 'uid' });
      if (!db.objectStoreNames.contains('posts'))   db.createObjectStore('posts',   { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reels'))   db.createObjectStore('reels',   { keyPath: 'id' });
      if (!db.objectStoreNames.contains('outbox'))  db.createObjectStore('outbox',  { keyPath: 'tempId' });
      // Stores actual video File/Blob for owner local reels — persists across sessions
      if (!db.objectStoreNames.contains('localReelVideos')) db.createObjectStore('localReelVideos', { keyPath: 'reelId' });
    };
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = ()  => reject(req.error);
  });
}

async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}

async function putOne(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function putMany(storeName, records) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t  = db.transaction(storeName, 'readwrite');
    const st = t.objectStore(storeName);
    records.forEach(r => st.put(r));
    t.oncomplete = resolve;
    t.onerror    = () => reject(t.error);
  });
}

async function getOne(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => reject(req.error);
  });
}

async function delOne(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export const saveMessage  = (msg)  => putOne('messages', msg);
export const saveMessages = (msgs) => putMany('messages', msgs);
export const deleteLocalMessage = (id) => delOne('messages', id);

export async function getMessages(chatId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const idx = db.transaction('messages', 'readonly').objectStore('messages').index('chatId');
    const req = idx.getAll(chatId);
    req.onsuccess = () =>
      resolve((req.result || []).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
    req.onerror = () => reject(req.error);
  });
}

// ── Media blobs ───────────────────────────────────────────────────────────────

export const saveMediaBlob = (key, blob) => putOne('media', { key, blob, savedAt: Date.now() });

export async function getMediaBlob(key) {
  const r = await getOne('media', key);
  return r?.blob || null;
}

// Download + cache a remote URL, return a local blob: URL
export async function getOrFetchMedia(url) {
  if (!url) return url;
  const cached = await getMediaBlob(url);
  if (cached) return URL.createObjectURL(cached);
  try {
    const res  = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    await saveMediaBlob(url, blob);
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}

// ── Chats ─────────────────────────────────────────────────────────────────────

export const saveChat  = (chat) => putOne('chats', chat);
export const getChats  = ()     => getAll('chats');

// ── Users ─────────────────────────────────────────────────────────────────────

export const saveUser      = (u)   => putOne('users', { ...u, uid: u.uid || u.id });
export const getCachedUser = (uid) => getOne('users', uid);

// ── Posts ─────────────────────────────────────────────────────────────────────

export const savePosts     = (posts) => putMany('posts', posts);
export const getCachedPosts = ()     => getAll('posts');

// ── Reels ─────────────────────────────────────────────────────────────────────

export const saveReels      = (reels) => putMany('reels', reels);
export const getCachedReels = ()      => getAll('reels');

// ── Outbox (queue messages written while offline) ─────────────────────────────

export const addToOutbox      = (msg)    => putOne('outbox', msg);
export const getOutbox        = ()       => getAll('outbox');
export const removeFromOutbox = (tempId) => delOne('outbox', tempId);

// ── Local Reel Videos (owner only) ───────────────────────────────────────────
// Stores the actual video File blob in IndexedDB so it persists across sessions.
// reelId is the Firestore doc ID returned after createLocalReel.

export const saveLocalReelVideo = (reelId, blob) =>
  putOne('localReelVideos', { reelId, blob, savedAt: Date.now() });

export async function getLocalReelVideo(reelId) {
  const r = await getOne('localReelVideos', reelId);
  if (!r?.blob) return null;
  return URL.createObjectURL(r.blob);
}

export const deleteLocalReelVideo = (reelId) => delOne('localReelVideos', reelId);
