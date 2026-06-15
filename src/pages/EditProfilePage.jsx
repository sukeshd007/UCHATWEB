// src/pages/EditProfilePage.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ArrowLeft, Loader2, Globe, FileText, User, AtSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, isUsernameAvailable } from '../firebase/firestoreService';
import { uploadProfileImage, uploadCoverImage } from '../firebase/storageService';
import Avatar from '../components/common/Avatar';
import toast from 'react-hot-toast';

export default function EditProfilePage() {
  const { userProfile, uid } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: userProfile?.displayName || '',
    username: userProfile?.username || '',
    bio: userProfile?.bio || '',
    website: userProfile?.website || '',
    isPrivate: userProfile?.isPrivate || false,
  });
  const [profilePhoto, setProfilePhoto] = useState(userProfile?.profilePhoto || null);
  const [coverPhoto, setCoverPhoto] = useState(userProfile?.coverPhoto || null);
  const [profileFile, setProfileFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken
  const profileRef = useRef();
  const coverRef = useRef();
  const debounceRef = useRef();

  const handle = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [key]: val }));

    if (key === 'username') {
      const clean = val.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30);
      setForm(f => ({ ...f, username: clean }));
      clearTimeout(debounceRef.current);
      if (clean === userProfile?.username) { setUsernameStatus('idle'); return; }
      if (clean.length >= 3) {
        setUsernameStatus('checking');
        debounceRef.current = setTimeout(async () => {
          const avail = await isUsernameAvailable(clean);
          setUsernameStatus(avail ? 'available' : 'taken');
        }, 500);
      }
    }
  };

  const handleProfilePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePhoto(URL.createObjectURL(file));
  };

  const handleCoverPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPhoto(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (usernameStatus === 'taken') { toast.error('Username is taken'); return; }
    if (form.displayName.trim().length < 2) { toast.error('Display name too short'); return; }
    setSaving(true);
    try {
      let updates = { ...form, displayName: form.displayName.trim() };

      if (profileFile) {
        const r = await uploadProfileImage(profileFile, uid);
        updates.profilePhoto = r.url;
      }
      if (coverFile) {
        const r = await uploadCoverImage(coverFile, uid);
        updates.coverPhoto = r.url;
      }

      await updateUserProfile(uid, updates);
      toast.success('Profile updated!');
      navigate(`/profile/${updates.username}`);
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const usernameHint = {
    idle: null,
    checking: { text: 'Checking…', color: 'var(--text-tertiary)' },
    available: { text: `@${form.username} is available`, color: 'var(--success-color)' },
    taken: { text: `@${form.username} is taken`, color: 'var(--error-color)' }
  }[usernameStatus];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        background: 'var(--nav-bg)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Edit Profile</h2>
        <button
          onClick={handleSave}
          disabled={saving || usernameStatus === 'taken'}
          style={{
            padding: '7px 18px', borderRadius: 'var(--radius-full)',
            background: 'var(--brand-gradient)', color: 'white',
            fontSize: 14, fontWeight: 700,
            opacity: (saving || usernameStatus === 'taken') ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}
        </button>
      </div>

      {/* Cover photo */}
      <div
        onClick={() => coverRef.current?.click()}
        style={{
          height: 160, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          background: coverPhoto ? `url(${coverPhoto}) center/cover` : 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)'
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'white' }}>
            <Camera size={24} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Change cover</span>
          </div>
        </div>
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverPhoto} />
      </div>

      {/* Profile photo */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 16,
          marginTop: -36, marginBottom: 20
        }}>
          <div
            onClick={() => profileRef.current?.click()}
            style={{
              position: 'relative', cursor: 'pointer',
              borderRadius: '50%', border: '3px solid var(--bg-primary)'
            }}
          >
            <Avatar src={profilePhoto} name={form.displayName} size={80} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Camera size={20} color="white" />
            </div>
          </div>
          <input ref={profileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhoto} />
          <button
            onClick={() => profileRef.current?.click()}
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--brand-secondary)',
              marginBottom: 8
            }}
          >
            Change photo
          </button>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field icon={<User size={16} />} label="Display Name">
            <input
              value={form.displayName}
              onChange={handle('displayName')}
              maxLength={50}
              placeholder="Your Name"
              style={inputStyle}
            />
          </Field>

          <Field icon={<AtSign size={16} />} label="Username" hint={userProfile?.username ? null : usernameHint}>
            {userProfile?.username ? (
              <div style={{ position: 'relative' }}>
                <input
                  value={form.username}
                  readOnly
                  style={{
                    ...inputStyle,
                    background: 'var(--surface-2)',
                    color: 'var(--text-secondary)',
                    cursor: 'not-allowed',
                    paddingRight: 80,
                  }}
                />
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
                  background: 'var(--surface-3)', padding: '3px 8px', borderRadius: 6,
                }}>LOCKED</span>
              </div>
            ) : (
              <input
                value={form.username}
                onChange={handle('username')}
                maxLength={30}
                placeholder="username"
                style={{
                  ...inputStyle,
                  borderColor: usernameStatus === 'taken' ? 'var(--error-color)' : usernameStatus === 'available' ? 'var(--success-color)' : undefined
                }}
              />
            )}
            {userProfile?.username && (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 5 }}>
                Username is permanent and cannot be changed after setup.
              </p>
            )}
          </Field>

          <Field icon={<FileText size={16} />} label="Bio">
            <textarea
              value={form.bio}
              onChange={handle('bio')}
              maxLength={150}
              placeholder="Write something about yourself…"
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right', display: 'block', marginTop: 4 }}>
              {form.bio.length}/150
            </span>
          </Field>

          <Field icon={<Globe size={16} />} label="Website">
            <input
              value={form.website}
              onChange={handle('website')}
              type="url"
              placeholder="https://yoursite.com"
              style={inputStyle}
            />
          </Field>

          {/* Privacy toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Private Account</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Only approved followers can see your posts
              </p>
            </div>
            <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={handle('isPrivate')}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              />
              <div style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.isPrivate ? 'var(--brand-primary)' : 'var(--surface-3)',
                transition: 'background 0.2s',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', top: 2,
                  left: form.isPrivate ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                }} />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 14,
  transition: 'border-color 0.2s, box-shadow 0.2s'
};

const Field = ({ icon, label, hint, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
    </div>
    {children}
    {hint && (
      <p style={{ fontSize: 11, color: hint.color, marginTop: 4 }}>{hint.text}</p>
    )}
  </div>
);
