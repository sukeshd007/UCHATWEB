// src/components/calls/CallModal.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Camera, Volume2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createCallSession, updateCallSession, subscribeToCall } from '../../firebase/firestoreService';
import { db } from '../../firebase/config';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc } from 'firebase/firestore';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export default function CallModal({ callType, remoteUser, onClose }) {
  const { uid, userProfile } = useAuth();
  const [callState, setCallState] = useState('calling'); // calling | active | ended
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const [callId, setCallId] = useState(null);
  const [frontCamera, setFrontCamera] = useState(true);
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const localStreamRef = useRef();
  const timerRef = useRef();
  const unsubRef = useRef();

  useEffect(() => {
    initCall();
    return () => {
      cleanup();
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const initCall = async () => {
    try {
      // Get media
      const constraints = callType === 'video'
        ? { audio: true, video: { facingMode: frontCamera ? 'user' : 'environment' } }
        : { audio: true, video: false };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote stream
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      // Create call document
      const id = await createCallSession(uid, remoteUser.id, callType);
      setCallId(id);

      // ICE candidates
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await addDoc(collection(db, 'calls', id, 'callerCandidates'), {
            ...e.candidate.toJSON(),
            createdAt: serverTimestamp()
          });
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await updateCallSession(id, { offer: { sdp: offer.sdp, type: offer.type } });

      // Listen for answer + ICE
      unsubRef.current = subscribeToCall(id, async (callDoc) => {
        if (callDoc.answer && pc.currentRemoteDescription === null) {
          const answer = new RTCSessionDescription(callDoc.answer);
          await pc.setRemoteDescription(answer);
          setCallState('active');
        }
        if (callDoc.status === 'ended' || callDoc.status === 'rejected' || callDoc.status === 'missed') {
          handleCallEnded(callDoc.status);
        }
      });

      // Listen for callee ICE candidates
      const candidatesUnsub = onSnapshot(
        collection(db, 'calls', id, 'calleeCandidates'),
        (snap) => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
            }
          });
        }
      );

      // Timeout for unanswered call
      setTimeout(() => {
        if (callState === 'calling') {
          handleEnd();
          toast('No answer');
        }
      }, 60000);

    } catch (e) {
      toast.error('Could not access camera/microphone. Check permissions.');
      onClose();
    }
  };

  const handleEnd = async () => {
    cleanup();
    if (callId) await updateCallSession(callId, { status: 'ended', endTime: serverTimestamp() }).catch(() => {});
    onClose();
  };

  const handleCallEnded = (status) => {
    cleanup();
    if (status === 'missed') toast('Call missed');
    onClose();
  };

  const cleanup = () => {
    clearInterval(timerRef.current);
    if (unsubRef.current) unsubRef.current();
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) { audioTrack.enabled = muted; setMuted(m => !m); }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) { videoTrack.enabled = videoOff; setVideoOff(v => !v); }
  };

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
        background: callType === 'video' ? '#000' : 'linear-gradient(135deg, #1a1040 0%, #0d1f4a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        userSelect: 'none'
      }}
    >
      {/* Video streams */}
      {callType === 'video' && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute', top: 20, right: 16,
              width: 100, height: 150,
              borderRadius: 16, objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.3)',
              zIndex: 2
            }}
          />
        </>
      )}

      {/* Overlay content */}
      <div style={{
        position: 'relative', zIndex: 3, flex: 1, width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: 24
      }}>
        {callType === 'voice' && (
          <>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: `3px solid ${callState === 'active' ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
              animation: callState === 'calling' ? 'pulse 1.5s infinite' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Avatar src={remoteUser?.profilePhoto} name={remoteUser?.displayName} size={90} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{remoteUser?.displayName}</h3>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>
              {callState === 'calling' ? 'Calling…' :
               callState === 'active' ? formatDuration(duration) : 'Call ended'}
            </p>
          </>
        )}

        {callType === 'video' && callState === 'calling' && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{remoteUser?.displayName}</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>Video calling…</p>
          </div>
        )}

        {callType === 'video' && callState === 'active' && (
          <div style={{ position: 'absolute', top: 20, left: 20 }}>
            <p style={{ color: 'white', fontSize: 14, fontWeight: 600, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 20 }}>
              {formatDuration(duration)}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '24px 24px calc(40px + env(safe-area-inset-bottom))'
      }}>
        <CallBtn onClick={toggleMute} label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </CallBtn>

        {callType === 'video' && (
          <CallBtn onClick={toggleVideo} label={videoOff ? 'Camera on' : 'Camera off'}>
            {videoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </CallBtn>
        )}

        {/* End call */}
        <button
          onClick={handleEnd}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)',
            transform: 'scale(1.1)'
          }}
        >
          <PhoneOff size={26} />
        </button>

        {callType === 'video' && (
          <CallBtn onClick={() => setFrontCamera(c => !c)} label="Flip">
            <Camera size={22} />
          </CallBtn>
        )}

        <CallBtn onClick={() => setSpeaker(s => !s)} label={speaker ? 'Speaker' : 'Earpiece'}>
          <Volume2 size={22} />
        </CallBtn>
      </div>
    </motion.div>
  );
}

const CallBtn = ({ children, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      width: 52, height: 52, borderRadius: '50%',
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', gap: 2
    }}
    title={label}
  >
    {children}
    {label && <span style={{ fontSize: 9, opacity: 0.7 }}>{label}</span>}
  </button>
);
