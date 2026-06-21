// src/pages/settings/InviteFriendsPage.jsx
import { useState } from 'react';
import { Share2, Copy, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsPageShell, Card, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

const GOAL = 50;

export default function InviteFriendsPage() {
  const { userProfile, isGuest } = useAuth();
  const inviteCount = userProfile?.inviteCount || 0;
  const pct = Math.min(100, Math.round((inviteCount / GOAL) * 100));
  const trialUntil = userProfile?.verifiedTrialUntil?.toDate ? userProfile.verifiedTrialUntil.toDate() : null;
  const trialActive = trialUntil && trialUntil.getTime() > Date.now();

  const inviteLink = userProfile?.username
    ? `${window.location.origin}/auth?ref=${userProfile.username}`
    : '';

  const handleShare = async () => {
    if (isGuest) { toast('Sign up to get your own invite link'); return; }
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me on UChat', url: inviteLink }); return; } catch {}
    }
    handleCopy();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <SettingsPageShell title="Follow and invite friends">
      {trialActive && (
        <Card padded>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BadgeCheck size={22} color="#0EA5E9" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Your free verified trial is active</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Expires {trialUntil.toLocaleDateString()}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card padded>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Invite friends, get verified free</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Invite 50 friends who sign up using your link and unlock a free 7-day verified badge.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ fontWeight: 700 }}>{inviteCount} / {GOAL} invites</span>
          <span style={{ color: 'var(--text-tertiary)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(135deg,#0EA5E9,#7C3AED)', transition: 'width 0.3s' }} />
        </div>
      </Card>

      <CardLabel>Your invite link</CardLabel>
      <Card padded>
        {isGuest ? (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Sign up for an account to get your own invite link.</div>
        ) : (
          <>
            <div style={{
              padding: '10px 12px', borderRadius: 10, background: 'var(--surface-3)',
              fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: 12
            }}>
              {inviteLink}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCopy} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'var(--surface-3)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Copy size={15} /> Copy
              </button>
              <button onClick={handleShare} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Share2 size={15} /> Share
              </button>
            </div>
          </>
        )}
      </Card>
    </SettingsPageShell>
  );
}
