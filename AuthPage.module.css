// src/pages/settings/GuidelinesPage.jsx
import { ScrollText, Lock, Users, ShieldAlert, Heart } from 'lucide-react';
import { SettingsPageShell, Card, CardLabel } from '../../components/settings/SettingsUI';

const GUIDELINES = [
  { icon: <Heart size={17} />, title: 'Be respectful', body: 'Treat others the way you\u2019d want to be treated. No harassment, hate speech, or targeted abuse.' },
  { icon: <ShieldAlert size={17} />, title: 'No harmful content', body: 'Don\u2019t post content that promotes violence, self-harm, or illegal activity.' },
  { icon: <Users size={17} />, title: 'Authentic accounts', body: 'Use your real identity or a clear persona. Impersonation and fake engagement are not allowed.' },
  { icon: <Lock size={17} />, title: 'Respect privacy', body: 'Don\u2019t share someone else\u2019s private information without their consent.' },
];

export default function GuidelinesPage() {
  return (
    <SettingsPageShell title="Privacy & Community Guidelines">
      <CardLabel>Community Guidelines</CardLabel>
      <Card>
        {GUIDELINES.map((g, i) => (
          <div key={g.title} style={{ padding: '14px 16px', display: 'flex', gap: 12, borderBottom: i === GUIDELINES.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 1 }}>{g.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{g.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{g.body}</div>
            </div>
          </div>
        ))}
      </Card>

      <CardLabel>Privacy</CardLabel>
      <Card padded>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <ScrollText size={17} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontWeight: 700, fontSize: 14 }}>How we handle your data</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          UChat stores your profile, posts, reels, messages, and activity to provide the
          app\u2019s features. Media is hosted on Cloudinary; your account data lives in
          Firebase. You control what\u2019s visible to others via Account privacy, Story
          privacy, and Blocked accounts in Settings. You can request account deletion
          at any time via Support.
        </div>
      </Card>
    </SettingsPageShell>
  );
}
