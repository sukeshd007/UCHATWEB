// src/pages/settings/AccountsCenterPage.jsx
import { useNavigate } from 'react-router-dom';
import { User, Smartphone, KeyRound, Megaphone, Link2, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsPageShell, Card, MenuRow, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

export default function AccountsCenterPage() {
  const { userProfile, isGuest } = useAuth();
  const navigate = useNavigate();

  return (
    <SettingsPageShell title="Accounts Center" subtitle="Manage your account, security and ad preferences">
      <Card>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {userProfile?.profilePhoto
              ? <img src={userProfile.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700 }}>{(userProfile?.displayName || '?')[0].toUpperCase()}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{userProfile?.displayName || userProfile?.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>@{userProfile?.username} \u00b7 UChat</div>
          </div>
        </div>
        <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
          1 account on this device \u00b7 2 accounts max per device
        </div>
      </Card>

      <CardLabel>Your information</CardLabel>
      <Card>
        <MenuRow label="Personal details" desc="Name, email, phone number, date of birth" icon={<User size={17} />}
          onClick={() => navigate('/edit-profile')} />
        <MenuRow label="Password and security" desc="Change password, login activity" icon={<KeyRound size={17} />}
          onClick={() => navigate('/settings/security')} last />
      </Card>

      <CardLabel>Account names</CardLabel>
      <Card padded>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          You're signed in as <strong>@{userProfile?.username}</strong>{isGuest ? ' (guest)' : ''}. UChat currently supports
          one account per login \u2014 use "Add Account" from Settings to sign in with a second account
          on this device (up to 2 total).
        </div>
      </Card>

      <CardLabel>Preferences</CardLabel>
      <Card>
        <MenuRow label="Connected experiences" desc="Apps and websites connected to UChat" icon={<Link2 size={17} />}
          onClick={() => navigate('/settings/permissions')} />
        <MenuRow label="Ad preferences" desc="Manage the ads you see" icon={<Megaphone size={17} />}
          onClick={() => toast('Ad preferences will be available once Ads is live \u2014 see Account type and tools.')}
          last />
      </Card>

      <CardLabel>Devices</CardLabel>
      <Card>
        <MenuRow label="Where you're logged in" desc="Manage devices signed into your account" icon={<Smartphone size={17} />}
          onClick={() => navigate('/settings/security')} last />
      </Card>
    </SettingsPageShell>
  );
}
