// src/components/calls/IncomingCallHandler.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToIncomingCalls, updateCallSession, getUserByUid } from '../../firebase/firestoreService';
import { db } from '../../firebase/config';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Avatar from '../common/Avatar';
import CallModal from './CallModal';
import { AnimatePresence as AP } from 'framer-motion';

export default function IncomingCallHandler() {
  const { uid } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const [caller, setCaller] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const ringtoneRef = useRef();

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToIncomingCalls(uid, async (call) => {
      if (call) {
        const callerUser = await getUserByUid(call.callerId);
        setCaller(callerUser);
        setIncomingCall(call);
        // Play ringtone (browser permitting)
        try {
          const ctx = new AudioContext();
          const oscillator = ctx.createOscillator();
          oscillator.connect(ctx.destination);
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.start();
          setTimeout(() => oscillator.stop(), 1000);
        } catch (e) {}
      } else {
        setIncomingCall(null);
        setCaller(null);
      }
    });
    return unsub;
  }, [uid]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      // Get media and create answer
      const constraints = incomingCall.callType === 'video'
        ? { audio: true, video: true }
        : { audio: true, video: false };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // Set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      // ICE candidates
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await addDoc(collection(db, 'calls', incomingCall.id, 'calleeCandidates'), {
            ...e.candidate.toJSON(), createdAt: serverTimestamp()
          });
        }
      };

      // Listen for caller candidates
      onSnapshot(collection(db, 'calls', incomingCall.id, 'callerCandidates'), (snap) => {
        snap.docChanges().forEach(c => {
          if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {});
        });
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateCallSession(incomingCall.id, {
        answer: { sdp: answer.sdp, type: answer.type },
        status: 'active',
        startTime: serverTimestamp()
      });

      setActiveCall({ ...incomingCall, pc, stream, caller });
      setIncomingCall(null);
    } catch (e) {
      console.error('Accept call failed:', e);
      handleDecline();
    }
  };

  const handleDecline = async () => {
    if (incomingCall) {
      await updateCallSession(incomingCall.id, { status: 'rejected' }).catch(() => {});
    }
    setIncomingCall(null);
    setCaller(null);
  };

  return (
    <>
      {/* Incoming call banner */}
      <AnimatePresence>
        {incomingCall && caller && (
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={{
              position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 'calc(var(--z-modal) + 10)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 24,
              padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
              minWidth: 320, maxWidth: 'calc(100vw - 32px)'
            }}
          >
            <div style={{ animation: 'pulse 1s infinite' }}>
              <Avatar src={caller.profilePhoto} name={caller.displayName} size={48} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {caller.displayName}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Incoming {incomingCall.callType} call…
              </p>
            </div>
            <button
              onClick={handleDecline}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}
            >
              <PhoneOff size={20} />
            </button>
            <button
              onClick={handleAccept}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#22c55e',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}
            >
              {incomingCall.callType === 'video' ? <Video size={20} /> : <Phone size={20} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active call modal */}
      <AnimatePresence>
        {activeCall && (
          <CallModal
            callType={activeCall.callType}
            remoteUser={caller}
            chatId={[uid, caller?.id].sort().join('_')}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
