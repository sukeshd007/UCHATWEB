// src/pages/ChatPage.jsx — with voice messages, camera, reactions, notifications
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, Video, Send, Image, Smile,
  Check, CheckCheck, Loader2, Download, WifiOff,
  Mic, MicOff, Camera, X, Play, Pause, Square
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToMessages, sendMessage, markChatRead,
  getUserByUid, addReaction, deleteMessage
} from '../firebase/firestoreService';
import { uploadChatMedia } from '../firebase/storageService';
import {
  saveMessage, saveMessages, getMessages,
  saveUser, getCachedUser,
  saveMediaBlob, getOrFetchMedia,
  addToOutbox, getOutbox, removeFromOutbox
} from '../utils/localDB';
import Avatar from '../components/common/Avatar';
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
  const [src, setSrc] = useState(url);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let revoked = null;
    setLoading(true);
    getOrFetchMedia(url).then(resolved => {
      if (resolved !== url) revoked = resolved;
      setSrc(resolved);
      setLoading(false);
    }).catch(() => { setSrc(url); setLoading(false); });
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [url]);
  if (loading) return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-3)', borderRadius: 14 }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
    </div>
  );
  if (type === 'video')
    return <video src={src} controls playsInline style={{ ...style, borderRadius: 14, display: 'block' }} />;
  return <img src={src} alt="" style={{ ...style, borderRadius: 14, objectFit: 'cover', display: 'block' }} />;
}

// ── Voice Message Player ──────────────────────────────────────────────────────
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

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    if (!chatId || !uid) return;
    loadCachedMessages();
    loadOtherUser();
    const unsub = subscribeToMessages(chatId, async (msgs) => {
      const normalized = msgs.map(normalizeMsg);
      setMessages(normalized);
      await saveMessages(normalized);
      markChatRead(chatId, uid);
      // Push notification for new messages from others
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
    return () => unsub();
  }, [chatId, uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCachedMessages = async () => {
    const cached = await getMessages(chatId);
    if (cached?.length) setMessages(cached.map(normalizeMsg));
  };

  const loadOtherUser = async () => {
    const parts = chatId.split('_');
    const otherId = parts.find(id => id !== uid);
    if (!otherId) return;
    const cached = await getCachedUser(otherId);
    if (cached) setOtherUser(cached);
    const user = await getUserByUid(otherId);
    if (user) { setOtherUser(user); saveUser(user); }
  };

  // ── Send text message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage(chatId, uid, {
        text: msgText, type: 'text',
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null
      });
      setReplyTo(null);
    } catch {
      if (isOffline) { await addToOutbox({ chatId, uid, text: msgText, type: 'text' }); toast('Saved offline — will send when connected'); }
      else toast.error('Failed to send');
    } finally { setSending(false); }
  };

  // ── Send media ─────────────────────────────────────────────────────────────
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

  // ── Voice recording ────────────────────────────────────────────────────────
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
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
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

  const renderMessage = (msg, idx) => {
    const isMine = msg.senderId === uid;
    const showDate = idx === 0 || getDateLabel(messages[idx - 1]) !== getDateLabel(msg);

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
            onDoubleClick={() => setReplyTo(msg)}
          >
            {/* Reply preview */}
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
              background: isMine
                ? 'linear-gradient(135deg, #7C3AED, #2563EB)'
                : 'var(--surface-2)',
              color: isMine ? 'white' : 'var(--text-primary)',
              fontSize: 14, lineHeight: 1.5,
              border: isMine ? 'none' : '1px solid var(--border-subtle)',
              wordBreak: 'break-word'
            }}>
              {msg.type === 'image' && <CachedMedia url={msg.mediaUrl} type="image" style={{ maxWidth: 240, maxHeight: 280 }} />}
              {msg.type === 'video' && <CachedMedia url={msg.mediaUrl} type="video" style={{ maxWidth: 240 }} />}
              {msg.type === 'voice' && <VoicePlayer url={msg.mediaUrl} isMine={isMine} />}
              {msg.type === 'text' && msg.text}
              {msg.pending && <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 6 }}>sending…</span>}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              marginTop: 3, padding: '0 2px'
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{getTimestamp(msg)}</span>
              {isMine && (
                msg.read
                  ? <CheckCheck size={13} style={{ color: '#0EA5E9' }} />
                  : <Check size={13} style={{ color: 'var(--text-tertiary)' }} />
              )}
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
              {otherUser.onlineStatus && (
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--bg-primary)' }} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{otherUser.displayName}</div>
              <div style={{ fontSize: 12, color: otherUser.onlineStatus ? '#22c55e' : 'var(--text-tertiary)' }}>
                {otherUser.onlineStatus ? 'Active now' : 'Offline'}
              </div>
            </div>
          </Link>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCall('voice')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 6 }}><Phone size={20} /></button>
          <button onClick={() => setShowCall('video')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 6 }}><Video size={20} /></button>
        </div>
      </div>

      {isOffline && (
        <div style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#EF4444' }}>
          <WifiOff size={14} /> You're offline — messages will send when reconnected
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {messages.map((msg, i) => renderMessage(msg, i))}
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

      {/* Audio preview before sending */}
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
          /* Recording UI */
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
            {/* Media buttons */}
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

            {/* Text input */}
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

            {/* Send or mic */}
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
