// src/pages/OnboardingPage.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, X, Loader2, AtSign, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isUsernameAvailable, completeProfileSetup } from '../firebase/firestoreService';
import { uploadProfileImage } from '../firebase/storageService';

const STEPS = ['username', 'name', 'photo'];

export default function OnboardingPage() {
  const { firebaseUser, userProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [photo, setPhoto] = useState(userProfile?.profilePhoto || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef();
  const navigate = useNavigate();
  let debounceTimer = useRef(null);

  const handleUsernameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30);
    setUsername(clean);
    setUsernameAvailable(null);
    
    clearTimeout(debounceTimer.current);
    if (clean.length >= 3) {
      setChecking(true);
      debounceTimer.current = setTimeout(async () => {
        const avail = await isUsernameAvailable(clean);
        setUsernameAvailable(avail);
        setChecking(false);
      }, 500);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      let profilePhotoUrl = photo;
      
      if (photoFile) {
        const result = await uploadProfileImage(photoFile, firebaseUser.uid, setUploadProgress);
        profilePhotoUrl = result.url;
      }
      
      await completeProfileSetup(firebaseUser.uid, {
        username,
        displayName,
        profilePhoto: profilePhotoUrl
      });
      
      toast.success('Welcome to UChat! 🎉');
      navigate('/');
    } catch (e) {
      toast.error(e.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = [
    username.length >= 3 && usernameAvailable === true,
    displayName.trim().length >= 2,
    true // photo is optional
  ];

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
      background: 'var(--bg-primary)', position: 'relative'
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at 30% 70%, rgba(124, 58, 237, 0.12) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--brand-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 24, fontWeight: 800,
            fontFamily: 'var(--font-display)', color: 'white',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)'
          }}>U</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Set up your profile</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Step {step + 1} of {STEPS.length}
          </p>
        </motion.div>

        {/* Progress */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 28,
          padding: '0 4px'
        }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--brand-primary)' : 'var(--border-default)',
              transition: 'background 0.3s ease'
            }} />
          ))}
        </div>

        {/* Card */}
        <motion.div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            boxShadow: 'var(--card-shadow)'
          }}
        >
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepMotion key="username">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Choose a username</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Your unique @handle on UChat. Choose carefully — this can only be set once and cannot be changed later.
                </p>
                <div style={{ position: 'relative' }}>
                  <AtSign size={16} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-tertiary)'
                  }} />
                  <input
                    value={username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="your_username"
                    autoFocus
                    style={{
                      width: '100%', padding: '13px 44px 13px 42px',
                      background: 'var(--input-bg)', border: '1px solid',
                      borderColor: usernameAvailable === false ? 'var(--error-color)' :
                                   usernameAvailable === true ? 'var(--success-color)' : 'var(--input-border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                      fontSize: 15, fontFamily: 'var(--font-mono)',
                      transition: 'all 0.2s'
                    }}
                  />
                  <div style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)', display: 'flex', alignItems: 'center'
                  }}>
                    {checking && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
                    {!checking && usernameAvailable === true && <Check size={16} style={{ color: 'var(--success-color)' }} />}
                    {!checking && usernameAvailable === false && <X size={16} style={{ color: 'var(--error-color)' }} />}
                  </div>
                </div>
                {usernameAvailable === false && (
                  <p style={{ fontSize: 12, color: 'var(--error-color)', marginTop: 6 }}>
                    @{username} is already taken
                  </p>
                )}
                {usernameAvailable === true && (
                  <p style={{ fontSize: 12, color: 'var(--success-color)', marginTop: 6 }}>
                    @{username} is available ✓
                  </p>
                )}
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>
                  Use letters, numbers, underscores, or periods. Min 3 characters.
                </p>
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                  <p style={{ fontSize: 12, color: '#B45309', margin: 0, lineHeight: 1.5 }}>
                    Your username is <strong>permanent</strong> and cannot be changed after setup. Choose wisely!
                  </p>
                </div>
              </StepMotion>
            )}

            {step === 1 && (
              <StepMotion key="name">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>What's your name?</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  This is how you'll appear to other users.
                </p>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-tertiary)'
                  }} />
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your Display Name"
                    autoFocus
                    maxLength={50}
                    style={{
                      width: '100%', padding: '13px 16px 13px 42px',
                      background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 15
                    }}
                  />
                </div>
              </StepMotion>
            )}

            {step === 2 && (
              <StepMotion key="photo">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Add a profile photo</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                  Help people recognize you. You can skip this step.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: 100, height: 100, borderRadius: '50%',
                      background: photo ? 'transparent' : 'var(--surface-3)',
                      border: '2px dashed var(--border-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {photo ? (
                      <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Camera size={28} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                      display: photo ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <Camera size={20} style={{ color: 'white' }} />
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      padding: '8px 20px', border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500,
                      color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer'
                    }}
                  >
                    {photo ? 'Change photo' : 'Upload photo'}
                  </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{
                      height: 3, background: 'var(--border-default)',
                      borderRadius: 2, overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%', background: 'var(--brand-gradient)',
                        width: `${uploadProgress}%`, transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                )}
              </StepMotion>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 1, padding: '13px 16px',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: 14,
                  color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer'
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (step < STEPS.length - 1) setStep(s => s + 1);
                else handleFinish();
              }}
              disabled={!canProceed[step] || loading}
              style={{
                flex: step > 0 ? 1 : undefined, width: step === 0 ? '100%' : undefined,
                padding: '13px 16px',
                background: canProceed[step] ? 'var(--brand-gradient)' : 'var(--surface-3)',
                color: canProceed[step] ? 'white' : 'var(--text-disabled)',
                borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14,
                cursor: canProceed[step] ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {step === STEPS.length - 1 ? 'Get Started' : 'Continue'}
                  {step === STEPS.length - 1 ? ' 🎉' : <ArrowRight size={14} />}
                </>
              )}
            </button>
          </div>

          {step === STEPS.length - 1 && (
            <button
              onClick={handleFinish}
              disabled={loading}
              style={{
                width: '100%', marginTop: 10, padding: '10px',
                background: 'transparent', color: 'var(--text-tertiary)',
                fontSize: 13, cursor: 'pointer'
              }}
            >
              Skip photo for now
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

const StepMotion = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -16 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);
