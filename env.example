// src/pages/settings/AppPermissionsPage.jsx
import { useState, useEffect } from 'react';
import { Bell, Camera, Mic, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { initPushNotifications, disablePush } from '../../firebase/messagingService';
import { SettingsPageShell, Card, ToggleRow, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

const PERMS = [
  { key: 'camera', label: 'Camera', desc: 'Used for posting photos, reels and video calls', icon: <Camera size={17} /> },
  { key: 'microphone', label: 'Microphone', desc: 'Used for reels with sound and calls', icon: <Mic size={17} /> },
  { key: 'geolocation', label: 'Location', desc: 'Used to tag your posts and reels with a location', icon: <MapPin size={17} /> },
];

const STATUS_LABEL = { granted: 'Allowed', denied: 'Blocked', prompt: 'Ask every time', unsupported: 'Not available' };
const STATUS_COLOR = { granted: '#16A34A', denied: '#EF4444', prompt: 'var(--text-tertiary)', unsupported: 'var(--text-tertiary)' };

export default function AppPermissionsPage() {
  const { uid, userProfile } = useAuth();
  const [statuses, setStatuses] = useState({});
  const [pushEnabled, setPushEnabled] = useState(userProfile?.pushEnabled || false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setStatuses(Object.fromEntries(PERMS.map(p => [p.key, 'unsupported'])));
      return;
    }
    PERMS.forEach(p => {
      navigator.permissions.query({ name: p.key }).then(
        result => {
          setStatuses(s => ({ ...s, [p.key]: result.state }));
          result.onchange = () => setStatuses(s => ({ ...s, [p.key]: result.state }));
        },
        () => setStatuses(s => ({ ...s, [p.key]: 'unsupported' }))
      );
    });
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePush(uid);
        setPushEnabled(false);
        toast.success('Push notifications turned off');
      } else {
        const token = await initPushNotifications(uid);
        if (token) { setPushEnabled(true); toast.success('Push notifications enabled'); }
        else toast.error('Could not enable push \u2014 check your browser\u2019s notification permission');
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <SettingsPageShell title="App and website permissions">
      <CardLabel>Notifications</CardLabel>
      <Card>
        <ToggleRow
          label="Push notifications"
          desc="Get notified on this device even when UChat is closed"
          icon={<Bell size={17} />}
          value={pushEnabled}
          onChange={togglePush}
          disabled={pushBusy}
          last
        />
      </Card>

      <CardLabel>Device permissions</CardLabel>
      <Card padded>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 8 }}>
          Browsers manage camera, microphone and location access at the site level \u2014
          to change these, use your browser\u2019s site settings for UChat.
        </div>
      </Card>
      <Card>
        {PERMS.map((p, i) => (
          <div key={p.key} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i === PERMS.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.desc}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[statuses[p.key]] || 'var(--text-tertiary)' }}>
              {STATUS_LABEL[statuses[p.key]] || '\u2014'}
            </span>
          </div>
        ))}
      </Card>
    </SettingsPageShell>
  );
}
