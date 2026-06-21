// src/pages/settings/VerifiedSubscriptionPage.jsx
import { BadgeCheck, Check, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { SettingsPageShell, Card, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

const BENEFITS = [
  'Verified badge on your profile, posts and reels',
  'Priority support',
  'Extra account protection',
  'Increased visibility in search and Explore',
];

export default function VerifiedSubscriptionPage() {
  const { userProfile } = useAuth();
  const isVerified = !!userProfile?.verified;
  const viaTrial = !!userProfile?.verifiedViaTrial;
  const trialUntil = userProfile?.verifiedTrialUntil?.toDate ? userProfile.verifiedTrialUntil.toDate() : null;

  const handleSubscribe = () => {
    // Honest state: online payments aren't wired up for this UChat instance
    // yet (needs a merchant account, e.g. Razorpay, configured by the app
    // owner) — so this doesn't pretend to charge anything.
    toast('Online payments aren\u2019t connected yet for UChat Verified. Contact support to ask about subscribing.', { duration: 6000 });
  };

  return (
    <SettingsPageShell title="UChat Verified">
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg,#0EA5E9,#7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BadgeCheck size={26} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>UChat Verified</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>\u20b9299 / month</div>
          </div>
        </div>

        {isVerified ? (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <VerifiedBadge size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>You\u2019re verified</div>
              {viaTrial && trialUntil && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Free trial active until {trialUntil.toLocaleDateString()}</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-3)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Not subscribed
          </div>
        )}
      </Card>

      <CardLabel>What you get</CardLabel>
      <Card padded>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BENEFITS.map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Check size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{b}</span>
            </div>
          ))}
        </div>
      </Card>

      {!isVerified && (
        <button
          onClick={handleSubscribe}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: 'linear-gradient(135deg,#0EA5E9,#7C3AED)', color: 'white',
            border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer'
          }}
        >
          Subscribe \u2014 \u20b9299/month
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0 4px', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        <Mail size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>You can also unlock a free 7-day verified trial by inviting 50 friends \u2014 see Follow and invite friends.</span>
      </div>
    </SettingsPageShell>
  );
}
