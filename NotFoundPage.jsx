// src/pages/settings/TimeManagementPage.jsx
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import {
  getTodayUsageSeconds, getDailyLimitMinutes, setDailyLimitMinutes,
  getReminderEnabled, setReminderEnabled
} from '../../utils/timeTracking';
import { SettingsPageShell, Card, RadioRow, ToggleRow, CardLabel } from '../../components/settings/SettingsUI';

const LIMIT_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
];

export default function TimeManagementPage() {
  const [usageSec, setUsageSec] = useState(getTodayUsageSeconds());
  const [limit, setLimit] = useState(getDailyLimitMinutes());
  const [reminder, setReminder] = useState(getReminderEnabled());

  useEffect(() => {
    const interval = setInterval(() => setUsageSec(getTodayUsageSeconds()), 5000);
    return () => clearInterval(interval);
  }, []);

  const usageMin = Math.floor(usageSec / 60);
  const usageHrs = Math.floor(usageMin / 60);
  const usageDisplay = usageHrs > 0 ? `${usageHrs}h ${usageMin % 60}m` : `${usageMin}m`;
  const pct = limit > 0 ? Math.min(100, Math.round((usageSec / 60 / limit) * 100)) : 0;

  return (
    <SettingsPageShell title="Time management" subtitle="See and manage your time on UChat">
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Today on this device</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{usageDisplay}</div>
          </div>
        </div>
        {limit > 0 && (
          <div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#EF4444' : 'var(--brand-gradient, linear-gradient(135deg,#7C3AED,#2563EB))', transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              {pct >= 100 ? 'You\u2019ve reached your daily limit' : `${pct}% of your ${limit}-minute daily limit`}
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10, lineHeight: 1.5 }}>
          Usage is tracked on this device only, while UChat is open and visible.
        </div>
      </Card>

      <CardLabel>Daily time limit</CardLabel>
      <Card>
        {LIMIT_OPTIONS.map((opt, i) => (
          <RadioRow
            key={opt.minutes}
            label={opt.label}
            selected={limit === opt.minutes}
            onClick={() => { setLimit(opt.minutes); setDailyLimitMinutes(opt.minutes); }}
            last={i === LIMIT_OPTIONS.length - 1}
          />
        ))}
      </Card>

      <Card>
        <ToggleRow
          label="Remind me when I reach my limit"
          desc="Get a one-time reminder each day after you cross your limit"
          value={reminder}
          onChange={() => { const v = !reminder; setReminder(v); setReminderEnabled(v); }}
          disabled={limit === 0}
          last
        />
      </Card>
    </SettingsPageShell>
  );
}
