// src/pages/settings/SecurityPage.jsx
import { useState } from 'react';
import { KeyRound, Smartphone, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sendPasswordReset } from '../../firebase/authService';
import { logoutCurrentDevice } from '../../firebase/authService';
import { useNavigate } from 'react-router-dom';
import { SettingsPageShell, Card, MenuRow, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

export default function SecurityPage() {
  const { userProfile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  const handleResetPassword = async () => {
    if (isGuest) { toast('Guests don\u2019t have a password to reset'); return; }
    if (!userProfile?.email) { toast.error('No email on file for this account'); return; }
    setSending(true);
    try {
      await sendPasswordReset(userProfile.email);
      toast.success(`Password reset email sent to ${userProfile.email}`);
    } catch (e) {
      toast.error(e.message || 'Could not send reset email');
    } finally {
      setSending(false);
    }
  };

  const handleLogoutEverywhere = async () => {
    if (!window.confirm('Log out of UChat on this device? You\u2019ll need to sign in again.')) return;
    await logoutCurrentDevice();
    navigate('/auth');
  };

  return (
    <SettingsPageShell title="Account & Security">
      <CardLabel>Login</CardLabel>
      <Card>
        <MenuRow
          label="Change password"
          desc={userProfile?.email ? `Send a reset link to ${userProfile.email}` : 'No email on file'}
          icon={<KeyRound size={17} />}
          onClick={handleResetPassword}
          last
        />
      </Card>

      <CardLabel>Where you're logged in</CardLabel>
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Smartphone size={18} color="var(--text-secondary)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>This device</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Active now</div>
          </div>
        </div>
      </Card>

      <CardLabel>Account</CardLabel>
      <Card>
        <MenuRow
          label="Log out of this device"
          icon={<ShieldAlert size={17} />}
          onClick={handleLogoutEverywhere}
          danger
          last
        />
      </Card>

      {sending && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>Sending\u2026</div>}
    </SettingsPageShell>
  );
}
