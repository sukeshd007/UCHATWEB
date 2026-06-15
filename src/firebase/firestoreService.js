// src/firebase/firestoreService.js
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, onSnapshot,
  serverTimestamp, increment, arrayUnion, arrayRemove,
  writeBatch, runTransaction, getCountFromServer
} from 'firebase/firestore';
import { db } from './config';

// ─── USERS ────────────────────────────────────────────────────────────────────

export const getUserByUid = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getUserByUsername = async (username) => {
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

// Checks if a username is available.
// Primary: fast single-doc read from the `usernames` index collection.
// Fallback: query the `users` collection directly (works even if the
//           `usernames` collection is empty or the rule has not deployed yet).
// Always returns a real boolean — never throws to the caller.
export const isUsernameAvailable = async (username) => {
  const clean = username.toLowerCase().trim();
  if (!clean || clean.length < 3) return false;
  try {
    const snap = await getDoc(doc(db, 'usernames', clean));
    return !snap.exists();
  } catch {
    // Fallback: query users collection directly
    try {
      const q = query(collection(db, 'users'), where('username', '==', clean), limit(1));
      const snap = await getDocs(q);
      return snap.empty;
    } catch {
      // Cannot reach Firestore — optimistically allow so UI does not lock up
      return true;
    }
  }
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const completeProfileSetup = async (uid, { username, displayName, profilePhoto }) => {
  // Build search keywords from username + displayName for full-text-like search
  const uname = username.toLowerCase();
  const dname = (displayName || '').toLowerCase();
  const keywords = Array.from(new Set([
    uname,
    dname,
    ...uname.split('').map((_, i) => uname.slice(0, i + 1)),
    ...dname.split(' ').flatMap(w => w.split('').map((_, i) => w.slice(0, i + 1))),
  ])).filter(k => k.length > 0);

  await updateDoc(doc(db, 'users', uid), {
    username: uname,
    displayName,
    profilePhoto: profilePhoto || null,
    profileSetupComplete: true,
    searchKeywords: keywords,
    updatedAt: serverTimestamp()
  });
  // Also write to usernames collection
  await setDoc(doc(db, 'usernames', uname), { uid });
};

export const subscribeToUser = (uid, callback) => {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
};

export const searchUsers = async (query_str, limitCount = 20) => {
  const q_lower = query_str.toLowerCase().trim();
  const end = q_lower + '\uf8ff';
  // Search username prefix
  const byUsername = query(collection(db, 'users'), where('username', '>=', q_lower), where('username', '<=', end), limit(limitCount));
  // Search by keyword array (covers displayName words too)
  const byKeyword = query(collection(db, 'users'), where('searchKeywords', 'array-contains', q_lower), limit(limitCount));
  const [snapU, snapK] = await Promise.all([getDocs(byUsername), getDocs(byKeyword)]);
  const seen = new Set();
  const results = [];
  for (const snap of [snapU, snapK]) {
    for (const d of snap.docs) {
      if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); }
    }
  }
  return results.slice(0, limitCount);
};

export const getSuggestedUsers = async (currentUid, limitCount = 10) => {
  const q = query(
    collection(db, 'users'),
    where('profileSetupComplete', '==', true),
    where('banned', '==', false),
    limit(limitCount + 1)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.id !== currentUid)
    .slice(0, limitCount);
};

// ─── FOLLOW SYSTEM ────────────────────────────────────────────────────────────

export const followUser = async (currentUid, targetUid) => {
  const batch = writeBatch(db);
  
  batch.set(doc(db, 'followers', `${targetUid}_${currentUid}`), {
    userId: targetUid,
    followerId: currentUid,
    createdAt: serverTimestamp()
  });
  
  batch.set(doc(db, 'following', `${currentUid}_${targetUid}`), {
    userId: currentUid,
    followingId: targetUid,
    createdAt: serverTimestamp()
  });
  
  batch.update(doc(db, 'users', targetUid), { followersCount: increment(1) });
  batch.update(doc(db, 'users', currentUid), { followingCount: increment(1) });
  
  await batch.commit();
  
  // Create notification
  await createNotification({
    recipientId: targetUid,
    senderId: currentUid,
    type: 'follow',
    message: 'started following you'
  });
};

export const unfollowUser = async (currentUid, targetUid) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'followers', `${targetUid}_${currentUid}`));
  batch.delete(doc(db, 'following', `${currentUid}_${targetUid}`));
  batch.update(doc(db, 'users', targetUid), { followersCount: increment(-1) });
  batch.update(doc(db, 'users', currentUid), { followingCount: increment(-1) });
  await batch.commit();
};

export const isFollowing = async (currentUid, targetUid) => {
  const snap = await getDoc(doc(db, 'following', `${currentUid}_${targetUid}`));
  return snap.exists();
};

export const getFollowers = async (uid, limitCount = 30) => {
  const q = query(
    collection(db, 'followers'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().followerId);
};

export const getFollowing = async (uid, limitCount = 30) => {
  const q = query(
    collection(db, 'following'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().followingId);
};

// ─── POSTS ────────────────────────────────────────────────────────────────────

export const createPost = async (uid, postData) => {
  const ref = await addDoc(collection(db, 'posts'), {
    authorId: uid,
    ...postData,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    savedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'users', uid), { postsCount: increment(1) });
  return ref.id;
};

export const getPost = async (postId) => {
  const snap = await getDoc(doc(db, 'posts', postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const deletePost = async (postId, uid) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'posts', postId));
  batch.update(doc(db, 'users', uid), { postsCount: increment(-1) });
  await batch.commit();
};

export const getFeedPosts = async (lastDoc = null, limitCount = 10) => {
  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  return {
    posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === limitCount
  };
};

export const getUserPosts = async (uid, lastDoc = null, limitCount = 12) => {
  let q = query(
    collection(db, 'posts'),
    where('authorId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  return {
    posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === limitCount
  };
};

// ─── LIKES ────────────────────────────────────────────────────────────────────

export const likePost = async (uid, postId, authorId) => {
  const likeId = `${uid}_${postId}`;
  const batch = writeBatch(db);
  batch.set(doc(db, 'likes', likeId), {
    userId: uid, postId, type: 'post', createdAt: serverTimestamp()
  });
  batch.update(doc(db, 'posts', postId), { likesCount: increment(1) });
  await batch.commit();
  
  if (authorId !== uid) {
    await createNotification({
      recipientId: authorId,
      senderId: uid,
      type: 'like',
      postId,
      message: 'liked your post'
    });
  }
};

export const unlikePost = async (uid, postId) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'likes', `${uid}_${postId}`));
  batch.update(doc(db, 'posts', postId), { likesCount: increment(-1) });
  await batch.commit();
};

export const isPostLiked = async (uid, postId) => {
  const snap = await getDoc(doc(db, 'likes', `${uid}_${postId}`));
  return snap.exists();
};

// ─── SAVES ────────────────────────────────────────────────────────────────────

export const savePost = async (uid, postId) => {
  await setDoc(doc(db, 'saves', `${uid}_${postId}`), {
    userId: uid, postId, createdAt: serverTimestamp()
  });
};

export const unsavePost = async (uid, postId) => {
  await deleteDoc(doc(db, 'saves', `${uid}_${postId}`));
};

export const isPostSaved = async (uid, postId) => {
  const snap = await getDoc(doc(db, 'saves', `${uid}_${postId}`));
  return snap.exists();
};

// ─── COMMENTS ────────────────────────────────────────────────────────────────

export const addComment = async (uid, postId, text, authorId) => {
  const ref = await addDoc(collection(db, 'comments'), {
    authorId: uid,
    postId,
    text,
    likesCount: 0,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
  
  if (authorId !== uid) {
    await createNotification({
      recipientId: authorId,
      senderId: uid,
      type: 'comment',
      postId,
      commentId: ref.id,
      message: 'commented on your post'
    });
  }
  return ref.id;
};

export const getComments = async (postId, lastDoc = null, limitCount = 20) => {
  let q = query(
    collection(db, 'comments'),
    where('postId', '==', postId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  return {
    comments: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === limitCount
  };
};

export const deleteComment = async (commentId, postId) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'comments', commentId));
  batch.update(doc(db, 'posts', postId), { commentsCount: increment(-1) });
  await batch.commit();
};

// ─── REELS ────────────────────────────────────────────────────────────────────

export const createReel = async (uid, reelData) => {
  const ref = await addDoc(collection(db, 'reels'), {
    authorId: uid,
    ...reelData,
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'users', uid), { reelsCount: increment(1) });
  return ref.id;
};

export const getReels = async (lastDoc = null, limitCount = 5) => {
  let q = query(
    collection(db, 'reels'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  return {
    reels: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === limitCount
  };
};

export const recordReelView = async (uid, reelId) => {
  await setDoc(doc(db, 'reelViews', `${uid}_${reelId}`), {
    userId: uid, reelId, viewedAt: serverTimestamp()
  }, { merge: true });
  await updateDoc(doc(db, 'reels', reelId), { viewsCount: increment(1) });
};

export const likeReel = async (uid, reelId, authorId) => {
  const likeId = `${uid}_reel_${reelId}`;
  const batch = writeBatch(db);
  batch.set(doc(db, 'likes', likeId), {
    userId: uid, reelId, type: 'reel', createdAt: serverTimestamp()
  });
  batch.update(doc(db, 'reels', reelId), { likesCount: increment(1) });
  await batch.commit();
};

export const unlikeReel = async (uid, reelId) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'likes', `${uid}_reel_${reelId}`));
  batch.update(doc(db, 'reels', reelId), { likesCount: increment(-1) });
  await batch.commit();
};

export const isReelLiked = async (uid, reelId) => {
  const snap = await getDoc(doc(db, 'likes', `${uid}_reel_${reelId}`));
  return snap.exists();
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const createNotification = async ({ recipientId, senderId, type, message, postId = null, reelId = null, commentId = null }) => {
  await addDoc(collection(db, 'notifications'), {
    recipientId,
    senderId,
    type, // like | comment | follow | mention | message | call
    message,
    postId,
    reelId,
    commentId,
    read: false,
    createdAt: serverTimestamp()
  });
};

export const getNotifications = async (uid, limitCount = 30) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const markNotificationsRead = async (uid) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
};

export const subscribeToNotifications = (uid, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    where('read', '==', false)
  );
  return onSnapshot(q, (snap) => callback(snap.docs.length));
};

// ─── CHATS ────────────────────────────────────────────────────────────────────

export const getOrCreateChat = async (uid1, uid2) => {
  const chatId = [uid1, uid2].sort().join('_');
  const ref = doc(db, 'chats', chatId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [uid1, uid2],
      type: 'direct',
      lastMessage: null,
      lastMessageTime: null,
      createdAt: serverTimestamp(),
      [`unread_${uid1}`]: 0,
      [`unread_${uid2}`]: 0
    });
  }
  return chatId;
};

export const createGroupChat = async (creatorUid, participants, groupName, groupPhoto = null) => {
  const ref = await addDoc(collection(db, 'chats'), {
    participants: [creatorUid, ...participants],
    type: 'group',
    groupName,
    groupPhoto,
    creatorId: creatorUid,
    admins: [creatorUid],
    lastMessage: null,
    lastMessageTime: null,
    createdAt: serverTimestamp()
  });
  return ref.id;
};

export const getUserChats = (uid, callback) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageTime', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const sendMessage = async (chatId, uid, messageData) => {
  const ref = await addDoc(collection(db, 'messages'), {
    chatId,
    senderId: uid,
    ...messageData,
    reactions: {},
    replyTo: null,
    deleted: false,
    createdAt: serverTimestamp(),
    seenBy: [uid]
  });
  
  // Update chat's last message
  const chatSnap = await getDoc(doc(db, 'chats', chatId));
  if (chatSnap.exists()) {
    const chat = chatSnap.data();
    const updates = {
      lastMessage: messageData.text || (messageData.type === 'image' ? '📷 Photo' : '🎬 Video'),
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: uid
    };
    // Increment unread for all participants except sender
    chat.participants.forEach(p => {
      if (p !== uid) updates[`unread_${p}`] = increment(1);
    });
    await updateDoc(doc(db, 'chats', chatId), updates);
  }
  
  return ref.id;
};

export const subscribeToMessages = (chatId, callback) => {
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const markChatRead = async (chatId, uid) => {
  await updateDoc(doc(db, 'chats', chatId), {
    [`unread_${uid}`]: 0
  });
};

export const addReaction = async (messageId, uid, emoji) => {
  await updateDoc(doc(db, 'messages', messageId), {
    [`reactions.${uid}`]: emoji
  });
};

export const deleteMessage = async (messageId) => {
  await updateDoc(doc(db, 'messages', messageId), {
    deleted: true,
    text: 'This message was deleted',
    deletedAt: serverTimestamp()
  });
};

// ─── NOTES ────────────────────────────────────────────────────────────────────

export const createNote = async (uid, text) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await setDoc(doc(db, 'notes', uid), {
    authorId: uid,
    text,
    expiresAt,
    createdAt: serverTimestamp()
  });
};

export const getActiveNotes = async (uids) => {
  if (!uids.length) return [];
  const now = new Date();
  const chunks = [];
  for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10));
  
  const results = await Promise.all(
    chunks.map(chunk =>
      getDocs(query(
        collection(db, 'notes'),
        where('authorId', 'in', chunk)
      ))
    )
  );
  
  return results.flatMap(snap =>
    snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(n => n.expiresAt?.toDate() > now)
  );
};

// ─── REPORTS ──────────────────────────────────────────────────────────────────

export const reportContent = async (reporterUid, { contentId, contentType, reason, description }) => {
  await addDoc(collection(db, 'reports'), {
    reporterUid,
    contentId,
    contentType, // post | reel | comment | user | message
    reason,
    description,
    status: 'pending',
    createdAt: serverTimestamp()
  });
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

export const banUser = async (uid, until = 'permanent') => {
  await updateDoc(doc(db, 'users', uid), {
    banned: true,
    bannedAt: serverTimestamp(),
    banUntil: until, // ISO string or 'permanent'
  });
};

export const unbanUser = async (uid) => {
  await updateDoc(doc(db, 'users', uid), {
    banned: false,
    bannedAt: null
  });
};

export const verifyUser = async (uid) => {
  await updateDoc(doc(db, 'users', uid), {
    verified: true,
    verifiedAt: serverTimestamp()
  });
};

export const unverifyUser = async (uid) => {
  await updateDoc(doc(db, 'users', uid), {
    verified: false
  });
};

export const setUserRole = async (uid, role) => {
  await updateDoc(doc(db, 'users', uid), { role });
};

export const getPlatformStats = async () => {
  const [usersSnap, postsSnap, reelsSnap, reportsSnap] = await Promise.all([
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(collection(db, 'posts')),
    getCountFromServer(collection(db, 'reels')),
    getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending')))
  ]);
  return {
    totalUsers: usersSnap.data().count,
    totalPosts: postsSnap.data().count,
    totalReels: reelsSnap.data().count,
    pendingReports: reportsSnap.data().count
  };
};

export const getAllReports = async (status = 'pending') => {
  const q = query(
    collection(db, 'reports'),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const resolveReport = async (reportId, resolution) => {
  await updateDoc(doc(db, 'reports', reportId), {
    status: resolution,
    resolvedAt: serverTimestamp()
  });
};

// ─── CALLS ────────────────────────────────────────────────────────────────────

export const createCallSession = async (callerId, calleeId, callType) => {
  const ref = await addDoc(collection(db, 'calls'), {
    callerId,
    calleeId,
    callType, // voice | video
    status: 'calling', // calling | active | ended | missed | rejected
    offer: null,
    answer: null,
    iceCandidates: [],
    startTime: null,
    endTime: null,
    duration: null,
    createdAt: serverTimestamp()
  });
  return ref.id;
};

export const updateCallSession = async (callId, data) => {
  await updateDoc(doc(db, 'calls', callId), data);
};

export const subscribeToCall = (callId, callback) => {
  return onSnapshot(doc(db, 'calls', callId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
};

export const subscribeToIncomingCalls = (uid, callback) => {
  const q = query(
    collection(db, 'calls'),
    where('calleeId', '==', uid),
    where('status', '==', 'calling')
  );
  return onSnapshot(q, (snap) => {
    const calls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(calls.length > 0 ? calls[0] : null);
  });
};
