// src/pages/settings/SupportPage.jsx
import { useState } from 'react';
import { Mail, MessageSquareWarning, HelpCircle, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { submitFeedback } from '../../firebase/firestoreService';
import { SettingsPageShell, Card, MenuRow, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

const FAQS = [
  { q: 'How do I get verified?', a: 'Subscribe to UChat Verified, or invite 50 friends for a free 7-day trial \u2014 see Follow and invite friends in Settings.' },
  { q: 'Why was my content removed?', a: 'Content that violates our Community Guidelines may be removed. Check Settings \u203a Privacy & Community Guidelines.' },
  { q: 'How do I report a problem?', a: 'Use the form below, or report individual posts/reels/accounts directly from their menu.' },
];

export default function SupportPage() {
  const { uid } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = async () => {
    if (!message.trim()) { toast.error('Write a message first'); return; }
    setSending(true);
    try {
      await submitFeedback(uid, message.trim());
      toast.success('Thanks \u2014 we\u2019ve received your message');
      setMessage('');
    } catch {
      toast.error('Could not send \u2014 try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsPageShell title="Support">
      <CardLabel>Contact us</CardLabel>
      <Card padded>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Tell us what\u2019s going on and we\u2019ll get back to you.
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your issue\u2026"
          rows={4}
          style={{
            width: '100%', padding: 12, borderRadius: 12, resize: 'vertical',
            background: 'var(--input-bg)', border: '1px solid var(--input-border)',
            color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={sending}
          style={{
            marginTop: 10, width: '100%', padding: '12px', borderRadius: 12,
            background: 'var(--brand-gradient, linear-gradient(135deg,#7C3AED,#2563EB))', color: 'white',
            border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <Send size={15} /> {sending ? 'Sending\u2026' : 'Send message'}
        </button>
      </Card>

      <CardLabel>Frequently asked questions</CardLabel>
      <Card>
        {FAQS.map((f, i) => (
          <div key={f.q} style={{ borderBottom: i === FAQS.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
            >
              <HelpCircle size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{f.q}</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: '0 16px 14px 42px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.a}</div>
            )}
          </div>
        ))}
      </Card>

      <CardLabel>Other ways to reach us</CardLabel>
      <Card>
        <MenuRow label="Email support" desc="support.uchat@gmail.com" icon={<Mail size={17} />}
          onClick={() => window.open('mailto:support.uchat@gmail.com')} />
        <MenuRow label="Report a problem" icon={<MessageSquareWarning size={17} />}
          onClick={() => document.querySelector('textarea')?.focus()} last />
      </Card>
    </SettingsPageShell>
  );
}
