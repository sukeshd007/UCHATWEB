// src/pages/settings/DataUsagePage.jsx
import { useState } from 'react';
import { getDataSaverEnabled, setDataSaverEnabled } from '../../utils/cloudinaryDownload';
import { SettingsPageShell, Card, ToggleRow } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

export default function DataUsagePage() {
  const [dataSaver, setDataSaver] = useState(getDataSaverEnabled());

  const toggle = () => {
    const v = !dataSaver;
    setDataSaver(v);
    setDataSaverEnabled(v);
    toast.success(v ? 'Data Saver turned on' : 'Data Saver turned off');
  };

  return (
    <SettingsPageShell title="Data usage and media quality">
      <Card>
        <ToggleRow
          label="Data Saver"
          desc="Reduce the quality of reels and images to use less data. Uploads always go out at your original quality."
          value={dataSaver}
          onChange={toggle}
          last
        />
      </Card>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '0 4px', lineHeight: 1.6 }}>
        When Data Saver is on, reels and photos load at a reduced quality across the app.
        Turn it off any time for the highest quality viewing experience.
      </div>
    </SettingsPageShell>
  );
}
