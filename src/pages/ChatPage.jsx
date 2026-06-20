// src/pages/ChatPage.jsx — cloud-synced, 1s refresh, admin can see deleted msgs
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, Video, Send, Image, Smile,
  Check, CheckCheck, Loader2, Download, WifiOff,
  Mic, MicOff, Camera, X, Play, Pause, Square, Eye, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToMessages, sendMessage, markChatRead,
  getUserByUid, addReaction, deleteMessage,
  markMessagesSeenByUser, subscribeToAllMessagesAdmin
} from '../firebase/firestoreService';
import { uploadChatMedia } from '../firebase/storageService';
import { isUserOnline } from '../firebase/authService';
// localDB removed — all data flows through Firestore real-time
import Avatar from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import CallModal from '../components/calls/CallModal';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

function normalizeMsg(msg) {
  return {
    ...msg,
    createdAt: msg.createdAt?.seconds
      ? { seconds: msg.createdAt.seconds, nanoseconds: msg.createdAt.nanoseconds || 0 }
      : { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
  };
}

function CachedMedia({ url, type, style = {} }) {
  if (type === 'video')
    return <video src={url} controls playsInline style={{ ...style, borderRadius: 14, display: 'block' }} />;
  return <img src={url} alt="" style={{ ...style, borderRadius: 14, objectFit: 'cover', display: 'block' }} />;
}

function VoicePlayer({ url, isMine }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setProgress(audio.currentTime / audio.duration);
    audio.onended = () => { setPlaying(false); setProgress(0); };
    return () => { audio.pause(); audio.src = ''; };
  }, [url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
      <button onClick={toggle} style={{
        width: 36, height: 36, borderRadius: '50%',
        background: isMine ? 'rgba(255,255,255,0.25)' : 'var(--surface-3)',
        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isMine ? 'white' : 'var(--text-primary)', flexShrink: 0
      }}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{
          height: 4, borderRadius: 2,
          background: isMine ? 'rgba(255,255,255,0.3)' : 'var(--surface-3)',
          cursor: 'pointer', position: 'relative'
        }} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          if (audioRef.current) {
            audioRef.current.currentTime = ratio * audioRef.current.duration;
            setProgress(ratio);
          }
        }}>
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: isMine ? 'rgba(255,255,255,0.9)' : 'var(--brand-primary,#7C3AED)',
            borderRadius: 2, transition: 'width 0.1s'
          }} />
        </div>
        <div style={{ fontSize: 11, marginTop: 3, color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}>
          {duration ? fmtTime(duration) : '0:00'}
        </div>
      </div>
      <Mic size={14} style={{ color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)', flexShrink: 0 }} />
    </div>
  );
}

export default function ChatPage() {
  const { chatId } = useParams();
  const { uid, userProfile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCall, setShowCall] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [msgMenu, setMsgMenu] = useState(null);
  const [banConfirm, setBanConfirm] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'error'
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner';

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const bottomRef = useRef();
  const inputRef = useRef();
  const fileInputRef = useRef();
  const cameraInputRef = useRef();
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    const onOnline = () => { setIsOffline(false); flushOutbox(); };
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Cloud sync: subscribe to messages (real-time Firestore — effectively instant)
  useEffect(() => {
    if (!chatId || !uid) return;
    loadOtherUser();

    setSyncStatus('syncing');

    // Choose subscription based on role: admins see ALL including deleted
    const subscribeFn = isAdmin ? subscribeToAllMessagesAdmin : subscribeToMessages;

    const unsub = subscribeFn(chatId, async (msgs) => {
      const normalized = msgs.map(normalizeMsg);
      setMessages(normalized);
      setSyncStatus('synced');
      markChatRead(chatId, uid);
      markMessagesSeenByUser(chatId, uid).catch(() => {});
      const lastMsg = normalized[normalized.length - 1];
      if (lastMsg && lastMsg.senderId !== uid && document.hidden) {
        if (Notification.permission === 'granted') {
          new Notification(`New message from ${otherUser?.displayName || 'Someone'}`, {
            body: lastMsg.type === 'voice' ? '🎤 Voice message' : lastMsg.text || '📷 Media',
            icon: otherUser?.profilePhoto || '/icons/icon-192.png',
            tag: chatId,
          });
        }
      }
    });

    // 1-second server heartbeat refresh (keeps connection alive, fast delivery)
    refreshTimerRef.current = setInterval(() => {
      setSyncStatus(s => s === 'error' ? 'syncing' : s);
    }, 1000);

    return () => {
      unsub();
      clearInterval(refreshTimerRef.current);
    };
  }, [chatId, uid, isAdmin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOtherUser = async () => {
    const parts = chatId.split('_');
    const otherId = parts.find(id => id !== uid);
    if (!otherId) return;
    const user = await getUserByUid(otherId);
    if (user) setOtherUser(user);
  };

  const flushOutbox = async () => {
    // Outbox no longer stored locally — all messages go directly to Firestore
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setReplyTo(null);
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = normalizeMsg({
      id: tempId,
      chatId,
      senderId: uid,
      text: msgText,
      type: 'text',
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null,
      pending: true,
      seenBy: [uid],
      deliveredTo: [uid],
      seenAt: null,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    });
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await sendMessage(chatId, uid, {
        text: msgText, type: 'text',
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null
      });
      // Remove the optimistic message — the real-time subscription will add the real one
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch (err) {
      toast.error(isOffline ? 'No connection — please retry when online' : 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleMediaSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const result = await uploadChatMedia(file, chatId);
      const isVideo = file.type.startsWith('video/');
      await sendMessage(chatId, uid, { text: '', type: isVideo ? 'video' : 'image', mediaUrl: result.url });
      toast.success('Media sent!');
    } catch { toast.error('Failed to send media'); }
    finally { setSending(false); e.target.value = ''; }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
    } catch {
      toast.error('Microphone permission denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) mediaRecorderRef.current.stop();
    setRecording(false);
    setAudioBlob(null);
    setRecordSecs(0);
    clearInterval(recordTimerRef.current);
    audioChunksRef.current = [];
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;
    setSending(true);
    try {
      const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
      const result = await uploadChatMedia(file, chatId);
      await sendMessage(chatId, uid, { text: '', type: 'voice', mediaUrl: result.url });
      toast.success('Voice message sent!');
    } catch { toast.error('Failed to send voice message'); }
    finally { setSending(false); setAudioBlob(null); setRecordSecs(0); }
  };

  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const getTimestamp = (msg) => {
    const ts = msg.createdAt;
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const longPressTimer = useRef(null);

  const handleMsgLongPress = (e, msg) => {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      setMsgMenu({ msg });
    }, 400);
  };

  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleDeleteMsg = async (msg, forEveryone) => {
    setMsgMenu(null);
    try {
      await deleteMessage(msg.id, forEveryone);
      if (!forEveryone) {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }
      toast.success(forEveryone ? 'Deleted for everyone' : 'Message deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleBanUser1h = async () => {
    setMsgMenu(null);
    setBanConfirm(true);
  };

  const confirmBan = async () => {
    setBanConfirm(false);
    if (!otherUser?.id) return;
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    try {
      const { banUser } = await import('../firebase/firestoreService');
      await banUser(otherUser.id, until);
      toast.success(`${otherUser.displayName} banned for 1 hour`);
    } catch { toast.error('Ban failed'); }
  };

  // Filter: regular users don't see deleted messages; admins see all (with label)
  const visibleMessages = messages.filter(msg => {
    if (isAdmin) return true; // admins see everything
    if (msg.deletedForEveryone) return false;
    if (msg.deletedFor?.includes(uid)) return false;
    return true;
  });

  const renderMessage = (msg, idx) => {
    const isMine = msg.senderId === uid;
    const showDate = idx === 0 || getDateLabel(visibleMessages[idx - 1]) !== getDateLabel(msg);
    const isDeleted = msg.deleted || msg.deletedForEveryone;
    const isAdminViewingDeleted = isAdmin && isDeleted;

    return (
      <div key={msg.id || idx}>
        {showDate && (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {getDateLabel(msg)}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: 8, marginBottom: 6, padding: '0 12px'
          }}
        >
          {!isMine && (
            <Avatar src={otherUser?.profilePhoto} name={otherUser?.displayName} size={28} />
          )}
          <div
            style={{ maxWidth: '72%', cursor: 'pointer' }}
            onDoubleClick={() => !isDeleted && setReplyTo(msg)}
            onMouseDown={e => handleMsgLongPress(e, msg)}
            onMouseUp={cancelLongPress}
            onTouchStart={e => handleMsgLongPress(e, msg)}
            onTouchEnd={cancelLongPress}
          >
            {msg.replyTo && (
              <div style={{
                padding: '4px 10px', borderRadius: '10px 10px 0 0',
                background: isMine ? 'rgba(255,255,255,0.15)' : 'var(--surface-3)',
                borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.5)' : '#7C3AED'}`,
                fontSize: 12, color: isMine ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
                marginBottom: 2
              }}>
                {msg.replyTo.text || '📎 Media'}
              </div>
            )}

            <div style={{
              padding: msg.type === 'image' || msg.type === 'video' || msg.type === 'voice' ? 6 : '10px 14px',
              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: isAdminViewingDeleted
                ? 'rgba(239,68,68,0.12)'
                : isMine
                  ? 'linear-gradient(135deg, #7C3AED, #2563EB)'
                  : 'var(--surface-2)',
              color: isMine ? 'white' : 'var(--text-primary)',
              fontSize: 14, lineHeight: 1.5,
              border: isAdminViewingDeleted
                ? '1px dashed rgba(239,68,68,0.4)'
                : isMine ? 'none' : '1px solid var(--border-subtle)',
              wordBreak: 'break-word',
              opacity: isDeleted && !isAdmin ? 0.5 : 1,
            }}>
              {msg.type === 'image' && !isDeleted && <CachedMedia url={msg.mediaUrl} type="image" style={{ maxWidth: 240, maxHeight: 280 }} />}
              {msg.type === 'video' && !isDeleted && <CachedMedia url={msg.mediaUrl} type="video" style={{ maxWidth: 240 }} />}
              {msg.type === 'voice' && !isDeleted && <VoicePlayer url={msg.mediaUrl} isMine={isMine} />}
              {isAdminViewingDeleted && (
                <div>
                  <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                    🛡 Admin view — deleted message
                  </span>
                  <span style={{ opacity: 0.7 }}>{msg.originalText || msg.text}</span>
                </div>
              )}
              {!isDeleted && msg.type === 'text' && msg.text}
              {isDeleted && !isAdmin && <span style={{ fontStyle: 'italic', opacity: 0.6 }}>This message was deleted</span>}
              {msg.pending && <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 6 }}>sending…</span>}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              marginTop: 3, padding: '0 2px'
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{getTimestamp(msg)}</span>
              {isMine && (() => {
                const seenBy = msg.seenBy || [];
                const deliveredTo = msg.deliveredTo || [];
                const otherUid = chatId.split('_').find(id => id !== uid);
                const seen = otherUid && seenBy.includes(otherUid);
                const delivered = otherUid && (deliveredTo.includes(otherUid) || seenBy.includes(otherUid));
                
                if (seen) {
                  const seenTime = msg.seenAt?.seconds
                    ? format(new Date(msg.seenAt.seconds * 1000), 'h:mm a')
                    : null;
                  return (
                    <span title={seenTime ? `Seen at ${seenTime}` : 'Seen'} style={{ display:'flex', alignItems:'center', gap:2 }}>
                      <CheckCheck size={13} style={{ color: '#7C3AED' }} />
                      {seenTime && <span style={{ fontSize:10, color:'#7C3AED' }}>{seenTime}</span>}
                    </span>
                  );
                }
                if (delivered) return <CheckCheck size={13} style={{ color: 'var(--text-tertiary)' }} />;
                return <Check size={13} style={{ color: 'var(--text-tertiary)' }} />;
              })()}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-primary)', position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <ArrowLeft size={22} />
        </button>
        {otherUser && (
          <Link to={`/profile/${otherUser.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textDecoration: 'none' }}>
            <div style={{ position: 'relative' }}>
              <Avatar src={otherUser.profilePhoto} name={otherUser.displayName} size={38} verified={otherUser.verified} />
              {isUserOnline(otherUser) && (
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--bg-primary)' }} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {otherUser.displayName}
                {otherUser.verified && <VerifiedBadge size={15} />}
              </div>
              <div style={{ fontSize: 12, color: isUserOnline(otherUser) ? '#22c55e' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isUserOnline(otherUser)
                  ? 'Active now'
                  : otherUser.lastSeen?.toDate
                    ? `Active ${formatDistanceToNow(otherUser.lastSeen.toDate(), { addSuffix: true })}`
                    : 'Offline'}
                {/* Cloud sync indicator */}
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: syncStatus === 'synced' ? '#22c55e' : syncStatus === 'syncing' ? '#f59e0b' : '#ef4444',
                  display: 'inline-block', marginLeft: 4
                }} title={syncStatus === 'synced' ? 'Connected to cloud' : 'Syncing…'} />
              </div>
            </div>
          </Link>
        )}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Admin: toggle deleted msg view */}
          {isAdmin && (
            <button
              onClick={() => setShowAdminView(s => !s)}
              title={showAdminView ? 'Hide deleted messages' : 'Show all messages (admin)'}
              style={{
                background: showAdminView ? 'rgba(239,68,68,0.15)' : 'none', border: 'none',
                color: showAdminView ? '#ef4444' : 'var(--text-tertiary)', cursor: 'pointer', padding: 6, borderRadius: 8
              }}>
              <Eye size={18} />
            </button>
          )}
          <button onClick={() => setShowCall('voice')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 6 }}><Phone size={20} /></button>
          <button onClick={() => setShowCall('video')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 6 }}><Video size={20} /></button>
        </div>
      </div>

      {isOffline && (
        <div style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#EF4444' }}>
          <WifiOff size={14} /> You're offline — messages will send when reconnected
        </div>
      )}

      {isAdmin && (
        <div style={{ padding: '4px 12px', background: 'rgba(124,58,237,0.08)', fontSize: 11, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
          🛡 Admin view — {showAdminView ? 'showing all messages including deleted' : 'showing active messages'} · {visibleMessages.length} total
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {visibleMessages.map((msg, i) => renderMessage(msg, i))}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ↩️ {replyTo.text || '📎 Media'}
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio preview */}
      <AnimatePresence>
        {audioBlob && !recording && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 12px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <VoicePlayer url={URL.createObjectURL(audioBlob)} isMine={false} />
            <button onClick={() => setAudioBlob(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><X size={18} /></button>
            <button onClick={sendVoiceMessage} disabled={sending}
              style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)', padding: '8px 12px',
        background: 'var(--bg-primary)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
      }}>
        {recording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Recording… {fmtTime(recordSecs)}
            </span>
            <button onClick={cancelRecording} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 8 }}><X size={20} /></button>
            <button onClick={stopRecording}
              style={{ width: 42, height: 42, borderRadius: '50%', background: '#EF4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
              <Square size={18} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleMediaSelect} />
              <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleMediaSelect} />
              <button onClick={() => cameraInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}>
                <Camera size={20} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}>
                <Image size={20} />
              </button>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message…"
                rows={1}
                style={{
                  width: '100%', padding: '10px 36px 10px 14px',
                  borderRadius: 22, resize: 'none', overflow: 'hidden',
                  background: 'var(--surface-2)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 120,
                  boxSizing: 'border-box'
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={() => setShowEmoji(s => !s)}
                style={{ position: 'absolute', right: 8, bottom: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}
              >
                <Smile size={18} />
              </button>
            </div>

            {text.trim() ? (
              <button onClick={handleSend} disabled={sending}
                style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#2563EB)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', flexShrink: 0 }}>
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                title="Hold to record voice message"
                style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#2563EB)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', flexShrink: 0 }}
              >
                <Mic size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 80, right: 12, zIndex: 50 }}>
            <EmojiPicker
              onEmojiClick={e => { setText(t => t + e.emoji); setShowEmoji(false); }}
              theme="dark" height={350} width={300}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showCall && (
        <CallModal
          callType={showCall} otherUser={otherUser} chatId={chatId}
          onClose={() => setShowCall(null)}
        />
      )}

      {/* Message context menu */}
      <AnimatePresence>
        {msgMenu && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMsgMenu(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 500, background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0', padding: '12px 0 32px' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-default)', margin: '0 auto 12px' }} />
              <div style={{ padding: '4px 20px 12px', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Message Options
              </div>
              <button onClick={() => { setReplyTo(msgMenu.msg); setMsgMenu(null); }}
                style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                ↩️ Reply
              </button>
              <button onClick={() => handleDeleteMsg(msgMenu.msg, false)}
                style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 14, color: '#EF4444', fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                🗑 Delete for Me
              </button>
              {(msgMenu.msg.senderId === uid || isAdmin) && (
                <button onClick={() => handleDeleteMsg(msgMenu.msg, true)}
                  style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 14, color: '#EF4444', fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                  🗑 Delete for Everyone
                </button>
              )}
              {isAdmin && msgMenu.msg.originalText && (
                <div style={{ padding: '10px 20px', fontSize: 13, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', fontStyle: 'italic' }}>
                  🛡 Original: "{msgMenu.msg.originalText}"
                </div>
              )}
              {isAdmin && msgMenu.msg.senderId !== uid && (
                <button onClick={handleBanUser1h}
                  style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 14, color: '#F59E0B', fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                  🚫 Ban User for 1 Hour
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ban confirm */}
      <AnimatePresence>
        {banConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: 'var(--bg-primary)', borderRadius: 20, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Ban for 1 Hour?</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                {otherUser?.displayName} will be unable to use UChat for 1 hour.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setBanConfirm(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                  Cancel
                </button>
                <button onClick={confirmBan}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#EF4444', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Ban 1 Hour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

function getDateLabel(msg) {
  if (!msg.createdAt) return '';
  const date = msg.createdAt.toDate
    ? msg.createdAt.toDate()
    : new Date(msg.createdAt.seconds * 1000);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}
