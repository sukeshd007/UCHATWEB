// src/pages/OnboardingPage.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, X, Loader2, AtSign, User, ArrowRight, SkipForward } from 'lucide-react';
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
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef();
  const navigate = useNavigate();
  const debounceTimer = useRef(null);

  const handleUsernameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30);
    setUsername(clean);
    setUsernameAvailable(null);
    clearTimeout(debounceTimer.current);
    if (clean.length >= 3) {
      setChecking(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const avail = await isUsernameAvailable(clean);
          setUsernameAvailable(avail);
        } catch {
          setUsernameAvailable(null);
          toast.error('Could not check username. Check your connection.');
        } finally {
          setChecking(false);
        }
      }, 500);
    } else {
      setChecking(false);
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

  const handleFinish = async (skipPhoto = false) => {
    setLoading(true);
    try {
      let profilePhotoUrl = null;
      if (!skipPhoto && photoFile) {
        const result = await uploadProfileImage(photoFile, firebaseUser.uid, setUploadProgress);
        profilePhotoUrl = result.url;
      }
      await completeProfileSetup(firebaseUser.uid, {
        username,
        displayName,
        profilePhoto: profilePhotoUrl,
      });
      toast.success('Welcome to UChat!');
      navigate('/');
    } catch (e) {
      toast.error(e.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = [
    username.length >= 3 && usernameAvailable === true,
    displayName.trim().length >= 1,
    true, // photo step always skippable
  ];

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          padding: 28, boxShadow: 'var(--card-shadow-hover)'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 18, color: 'white'
            }}>U</div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>UChat</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Set up your profile</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Step {step + 1} of {STEPS.length}
          </p>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--border-default)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
              style={{ height: '100%', background: 'var(--brand-gradient)', borderRadius: 2 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0 — Username */}
          {step === 0 && (
            <StepMotion key="username">
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Choose a username</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
                This is permanent and cannot be changed later.
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
                  maxLength={30}
                  style={{
                    width: '100%', padding: '13px 42px 13px 40px',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 15,
                    transition: 'border-color 0.2s',
                    borderColor: usernameAvailable === true ? 'var(--success-color)'
                      : usernameAvailable === false ? 'var(--error-color)' : 'var(--input-border)'
                  }}
                />
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                  {checking && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
                  {!checking && usernameAvailable === true && <Check size={15} style={{ color: 'var(--success-color)' }} />}
                  {!checking && usernameAvailable === false && <X size={15} style={{ color: 'var(--error-color)' }} />}
                </div>
              </div>
              {usernameAvailable === false && (
                <p style={{ fontSize: 12, color: 'var(--error-color)', marginTop: 6 }}>
                  @{username} is already taken
                </p>
              )}
              {usernameAvailable === true && (
                <p style={{ fontSize: 12, color: 'var(--success-color)', marginTop: 6 }}>
                  @{username} is available
                </p>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>
                Letters, numbers, underscores, periods. Min 3 characters.
              </p>
            </StepMotion>
          )}

          {/* Step 1 — Display Name */}
          {step === 1 && (
            <StepMotion key="name">
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>What's your name?</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
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

          {/* Step 2 — Photo (optional) */}
          {step === 2 && (
            <StepMotion key="photo">
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Add a profile photo</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Optional — you can always add one later in settings.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 96, height: 96, borderRadius: '50%',
                    background: photo ? 'transparent' : 'var(--surface-3)',
                    border: '2px dashed var(--border-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', position: 'relative'
                  }}
                >
                  {photo ? (
                    <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={26} style={{ color: 'var(--text-tertiary)' }} />
                  )}
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
                  <div style={{ height: 3, background: 'var(--border-default)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--brand-gradient)', width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </StepMotion>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
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
              else handleFinish(false);
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
                {step < STEPS.length - 1 && <ArrowRight size={14} />}
              </>
            )}
          </button>
        </div>

        {/* Skip photo button on last step */}
        {step === STEPS.length - 1 && (
          <button
            onClick={() => handleFinish(true)}
            disabled={loading}
            style={{
              width: '100%', marginTop: 10, padding: '10px',
              background: 'transparent', color: 'var(--text-tertiary)',
              fontSize: 13, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <SkipForward size={13} />
            Skip photo for now
          </button>
        )}
      </motion.div>
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
