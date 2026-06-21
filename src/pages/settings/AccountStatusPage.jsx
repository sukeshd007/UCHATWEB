// src/pages/settings/AccountStatusPage.jsx
import { ShieldCheck, ShieldX, ShieldQuestion } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsPageShell, Card, CardLabel } from '../../components/settings/SettingsUI';

export default function AccountStatusPage() {
  const { userProfile } = useAuth();
  const banned = !!userProfile?.banned;
  const verified = !!userProfile?.verified;

  return (
    <SettingsPageShell title="Account Status">
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: banned ? 'rgba(239,68,68,0.12)' : verified ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {banned ? <ShieldX size={24} color="#EF4444" /> : verified ? <ShieldCheck size={24} color="#16A34A" /> : <ShieldQuestion size={24} color="#6B7280" />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>
              {banned ? 'Banned' : verified ? 'Verified' : 'Active'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              {banned ? 'Your account has restricted access' : verified ? 'Your account is in good standing' : 'No issues with your account'}
            </div>
          </div>
        </div>

        {banned && userProfile?.banUntil && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {userProfile.banUntil === 'permanent'
              ? 'This is a permanent restriction.'
              : `This restriction is in effect until ${userProfile.banUntil}.`}
            {' '}If you think this is a mistake, contact Support to appeal.
          </div>
        )}
      </Card>

      <CardLabel>What this means</CardLabel>
      <Card padded>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {banned ? (
            <>While banned, you may be unable to post, comment, message, or interact with other accounts.
            Appeals can be submitted via Settings \u203a Support.</>
          ) : verified ? (
            <>Verified accounts have confirmed their identity or unlocked verification through UChat Verified
            or the invite-friends program. Verified status can be removed if our Community Guidelines are violated.</>
          ) : (
            <>Your account currently has no restrictions. Keep following our Community Guidelines to stay
            in good standing.</>
          )}
        </div>
      </Card>
    </SettingsPageShell>
  );
}
