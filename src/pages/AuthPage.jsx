// src/pages/AuthPage.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Phone, ArrowRight, Loader2, UserCircle2, Sparkles, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  registerWithEmail, loginWithEmail, loginWithGoogle,
  loginAsGuest, sendPasswordReset, setupRecaptcha, sendPhoneOTP
} from '../firebase/authService';
import {
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink
} from 'firebase/auth';
import { auth } from '../firebase/config';
import styles from './AuthPage.module.css';

const ACTION_CODE_SETTINGS = {
  url: window.location.origin + '/auth',
  handleCodeInApp: true,
};

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', phone: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [magicSent, setMagicSent] = useState(false);
  const navigate = useNavigate();

  const handle = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const withLoading = async (fn) => {
    setLoading(true);
    try { await fn(); }
    catch (e) { toast.error(friendlyError(e.code || e.message)); }
    finally { setLoading(false); }
  };

  const handleEmailLogin = () => withLoading(async () => {
    await loginWithEmail(form.email, form.password);
    navigate('/');
  });

  const handleEmailSignup = () => withLoading(async () => {
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    await registerWithEmail(form.email, form.password);
    toast.success('Account created! Please verify your email.');
    navigate('/onboarding');
  });

  const handleGoogle = () => withLoading(async () => {
    await loginWithGoogle();
    navigate('/');
  });

  const handleGuest = () => withLoading(async () => {
    const { profile } = await loginAsGuest();
    toast.success(`Welcome, ${profile.username}!`);
    navigate('/');
  });

  const handlePasswordReset = () => withLoading(async () => {
    if (!form.email) { toast.error('Enter your email first'); return; }
    await sendPasswordReset(form.email);
    toast.success('Password reset email sent!');
  });

  const handleSendOTP = () => withLoading(async () => {
    const verifier = setupRecaptcha('recaptcha-container');
    const result = await sendPhoneOTP(form.phone, verifier);
    setConfirmationResult(result);
    setOtpSent(true);
    toast.success('OTP sent!');
  });

  const handleVerifyOTP = () => withLoading(async () => {
    await confirmationResult.confirm(form.otp);
    navigate('/onboarding');
  });

  const handleMagicLink = () => withLoading(async () => {
    if (!form.email) { toast.error('Enter your email first'); return; }
    await sendSignInLinkToEmail(auth, form.email, ACTION_CODE_SETTINGS);
    window.localStorage.setItem('emailForSignIn', form.email);
    setMagicSent(true);
    toast.success('Magic link sent! Check your inbox.');
  });

  const TABS = [
    { id: 'login', label: 'Sign In' },
    { id: 'signup', label: 'Sign Up' },
    { id: 'phone', label: 'Phone' },
    { id: 'magic', label: 'Magic Link' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.container}>
        <motion.div
          className={styles.brand}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.logo}><span>U</span></div>
          <h1 className={styles.brandName}>UChat</h1>
          <p className={styles.tagline}>Connect. Share. Belong.</p>
        </motion.div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Scrollable tab bar */}
          <div className={styles.tabsWrap}>
            <div className={styles.tabs}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── Sign In ─────────────────────────────────── */}
              {tab === 'login' && (
                <div className={styles.form}>
                  <InputField
                    icon={<Mail size={16} />}
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={handle('email')}
                    onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  />
                  <div className={styles.passwordField}>
                    <InputField
                      icon={<Lock size={16} />}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={form.password}
                      onChange={handle('password')}
                      onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                    />
                    <button
                      className={styles.eyeBtn}
                      onClick={() => setShowPassword(s => !s)}
                      type="button"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button className={styles.forgotLink} onClick={handlePasswordReset}>
                    Forgot password?
                  </button>
                  <PrimaryButton onClick={handleEmailLogin} loading={loading}>
                    Sign In
                  </PrimaryButton>
                </div>
              )}

              {/* ── Sign Up ─────────────────────────────────── */}
              {tab === 'signup' && (
                <div className={styles.form}>
                  <InputField
                    icon={<Mail size={16} />}
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={handle('email')}
                  />
                  <div className={styles.passwordField}>
                    <InputField
                      icon={<Lock size={16} />}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password (min 6 chars)"
                      value={form.password}
                      onChange={handle('password')}
                    />
                    <button className={styles.eyeBtn} onClick={() => setShowPassword(s => !s)} type="button">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className={styles.passwordField}>
                    <InputField
                      icon={<Lock size={16} />}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={form.confirmPassword}
                      onChange={handle('confirmPassword')}
                      onKeyDown={e => e.key === 'Enter' && handleEmailSignup()}
                    />
                    <button className={styles.eyeBtn} onClick={() => setShowConfirm(s => !s)} type="button">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && form.confirmPassword && (
                    <PasswordMatch match={form.password === form.confirmPassword} />
                  )}
                  <PasswordStrength password={form.password} />
                  <PrimaryButton onClick={handleEmailSignup} loading={loading}>
                    Create Account
                  </PrimaryButton>
                </div>
              )}

              {/* ── Phone OTP ────────────────────────────────── */}
              {tab === 'phone' && (
                <div className={styles.form}>
                  {!otpSent ? (
                    <>
                      <p className={styles.otpHint}>Enter your phone number with country code</p>
                      <InputField
                        icon={<Phone size={16} />}
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={form.phone}
                        onChange={handle('phone')}
                      />
                      <div id="recaptcha-container" />
                      <PrimaryButton onClick={handleSendOTP} loading={loading}>Send OTP</PrimaryButton>
                    </>
                  ) : (
                    <>
                      <p className={styles.otpHint}>Enter the 6-digit code sent to <strong>{form.phone}</strong></p>
                      <InputField
                        type="text"
                        placeholder="● ● ● ● ● ●"
                        value={form.otp}
                        onChange={handle('otp')}
                        maxLength={6}
                        className={styles.otpInput}
                      />
                      <PrimaryButton onClick={handleVerifyOTP} loading={loading}>Verify & Continue</PrimaryButton>
                      <button className={styles.forgotLink} onClick={() => setOtpSent(false)}>← Change number</button>
                    </>
                  )}
                </div>
              )}

              {/* ── Magic Link ───────────────────────────────── */}
              {tab === 'magic' && (
                <div className={styles.form}>
                  {!magicSent ? (
                    <>
                      <div className={styles.magicInfo}>
                        <Sparkles size={18} style={{ color: '#7C3AED', flexShrink: 0 }} />
                        <p>No password needed. We'll send a one-click sign-in link to your email.</p>
                      </div>
                      <InputField
                        icon={<Mail size={16} />}
                        type="email"
                        placeholder="Email address"
                        value={form.email}
                        onChange={handle('email')}
                        onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
                      />
                      <PrimaryButton onClick={handleMagicLink} loading={loading}>
                        <KeyRound size={16} /> Send Magic Link
                      </PrimaryButton>
                    </>
                  ) : (
                    <div className={styles.magicSent}>
                      <div className={styles.magicIcon}>✉️</div>
                      <h3>Check your inbox!</h3>
                      <p>We sent a sign-in link to <strong>{form.email}</strong>. Click it to log in instantly.</p>
                      <button className={styles.forgotLink} onClick={() => setMagicSent(false)}>Resend link</button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className={styles.divider}><span>or continue with</span></div>

          <div className={styles.socials}>
            <SocialButton onClick={handleGoogle} disabled={loading}>
              <GoogleIcon />
              <span>Google</span>
            </SocialButton>
            <SocialButton onClick={handleGuest} disabled={loading} variant="ghost">
              <UserCircle2 size={18} />
              <span>Continue as Guest</span>
            </SocialButton>
          </div>

          <p className={styles.guestNote}>
            Guest accounts get a permanent unique ID (e.g. guest0123456). Username cannot be changed later.
          </p>
        </motion.div>

        <p className={styles.legal}>
          By continuing, you agree to UChat's{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

const InputField = ({ icon, className = '', ...props }) => (
  <div className={styles.inputWrap}>
    {icon && <span className={styles.inputIcon}>{icon}</span>}
    <input className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${className}`} {...props} />
  </div>
);

const PrimaryButton = ({ children, loading, onClick, ...props }) => (
  <button className={styles.primaryBtn} onClick={onClick} disabled={loading} {...props}>
    {loading ? <Loader2 size={18} className="animate-spin" /> : <>{children} <ArrowRight size={16} /></>}
  </button>
);

const SocialButton = ({ children, variant = 'outline', ...props }) => (
  <button className={`${styles.socialBtn} ${variant === 'ghost' ? styles.socialGhost : ''}`} {...props}>
    {children}
  </button>
);

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
  return (
    <div className={styles.strengthWrap}>
      <div className={styles.strengthBars}>
        {[0,1,2,3].map(i => (
          <div key={i} className={styles.strengthBar} style={{ background: i < score ? colors[score] : 'var(--border-default)' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontWeight: 600 }}>{labels[score]}</span>
    </div>
  );
};

const PasswordMatch = ({ match }) => (
  <p style={{ fontSize: 12, color: match ? '#10B981' : '#EF4444', fontWeight: 600, marginTop: -4 }}>
    {match ? '✓ Passwords match' : '✗ Passwords do not match'}
  </p>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const friendlyError = (code) => {
  const map = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/invalid-verification-code': 'Invalid OTP code',
    'auth/invalid-credential': 'Invalid email or password',
  };
  return map[code] || 'Something went wrong. Please try again.';
};
