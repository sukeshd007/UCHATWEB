// src/pages/settings/AboutPage.jsx
import { SettingsPageShell, Card, CardLabel } from '../../components/settings/SettingsUI';

export default function AboutPage() {
  return (
    <SettingsPageShell title="About UChat">
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--brand-gradient, linear-gradient(135deg,#7C3AED,#2563EB))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 20, color: 'white'
          }}>U</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>UChat</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Version 7c</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          UChat is a social platform for sharing photos, reels, and messages with the people
          who matter to you.
        </div>
      </Card>

      <CardLabel>Legal</CardLabel>
      <Card padded>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
          \u00a9 {new Date().getFullYear()} UChat. All rights reserved.<br />
          Terms of Service \u00b7 Privacy Policy \u00b7 Community Guidelines
        </div>
      </Card>
    </SettingsPageShell>
  );
}
