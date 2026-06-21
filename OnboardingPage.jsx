// src/pages/settings/AccountToolsPage.jsx
import { useState, useEffect } from 'react';
import { Eye, Heart, MessageCircle, Share2, Repeat2, Sparkles, DollarSign, Megaphone, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAccountAnalytics } from '../../firebase/firestoreService';
import { SettingsPageShell, Card, CardLabel, MenuRow } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

const TRIAL_REEL_THRESHOLD = 200;
const MONETIZATION_FOLLOWER_THRESHOLD = 1000;
const MONETIZATION_AGE_MIN = 18;

const calcAge = (dobString) => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const StatTile = ({ icon, label, value, color }) => (
  <div style={{ flex: '1 1 30%', minWidth: 90, padding: '14px 10px', borderRadius: 12, background: 'var(--surface-3)', textAlign: 'center' }}>
    <div style={{ color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
  </div>
);

export default function AccountToolsPage() {
  const { uid, userProfile } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getAccountAnalytics(uid, 30)
      .then(setAnalytics)
      .catch(() => toast.error('Could not load analytics'))
      .finally(() => setLoading(false));
  }, [uid]);

  const followers = userProfile?.followersCount || 0;
  const age = calcAge(userProfile?.dob);

  const trialEligible = followers >= TRIAL_REEL_THRESHOLD;
  const monetizationEligible = followers >= MONETIZATION_FOLLOWER_THRESHOLD && age !== null && age >= MONETIZATION_AGE_MIN;

  return (
    <SettingsPageShell title="Account type and tools">
      <CardLabel>Insights \u00b7 Last 30 days</CardLabel>
      <Card padded>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-tertiary)' }}>Loading\u2026</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <StatTile icon={<Eye size={18} />} label="Views" value={analytics?.views ?? 0} color="#0EA5E9" />
              <StatTile icon={<Heart size={18} />} label="Likes" value={analytics?.likes ?? 0} color="#EF4444" />
              <StatTile icon={<MessageCircle size={18} />} label="Comments" value={analytics?.comments ?? 0} color="#7C3AED" />
              <StatTile icon={<Share2 size={18} />} label="Shares" value={analytics?.shares ?? 0} color="#16A34A" />
              <StatTile icon={<Repeat2 size={18} />} label="Reposts" value={analytics?.reposts ?? 0} color="#10B981" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12, lineHeight: 1.5 }}>
              Based on your {analytics?.contentCount ?? 0} most recent posts and reels.
              {' '}Share counts only include shares logged after this feature launched.
            </div>
          </>
        )}
      </Card>

      <CardLabel>Grow your account</CardLabel>
      <Card>
        <MenuRow
          icon={<Sparkles size={17} />}
          label="Trial reel"
          desc={trialEligible ? 'Eligible \u2014 boost a reel to new viewers' : `Eligible after ${TRIAL_REEL_THRESHOLD} followers (${followers}/${TRIAL_REEL_THRESHOLD})`}
          badge={trialEligible ? 'Eligible' : null}
          onClick={() => trialEligible ? toast('Trial reels are coming soon!') : toast(`Reach ${TRIAL_REEL_THRESHOLD} followers to unlock this.`)}
        />
        <MenuRow
          icon={<DollarSign size={17} />}
          label="Monetization"
          desc={monetizationEligible ? 'Eligible \u2014 apply to start earning' : `Requires ${MONETIZATION_FOLLOWER_THRESHOLD}+ followers and age 18+`}
          badge={monetizationEligible ? 'Eligible' : null}
          onClick={() => monetizationEligible ? toast('Monetization applications are coming soon!') : toast('You\u2019ll unlock this once you meet the requirements.')}
          last
        />
      </Card>

      <CardLabel>Ads</CardLabel>
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Megaphone size={18} color="#EA580C" />
          <div style={{ fontWeight: 700, fontSize: 14 }}>Pay for views and reach</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
          Promote your posts and reels to reach more people. Ads require a connected
          payment method, which isn\u2019t set up yet for this UChat instance.
        </div>
        <button
          onClick={() => toast('Ads will be available once a payment provider is connected.')}
          style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'var(--surface-3)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Lock size={14} /> Not available yet
        </button>
      </Card>
    </SettingsPageShell>
  );
}
