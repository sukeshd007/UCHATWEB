// src/pages/settings/ArchivingDownloadsPage.jsx
import { useState } from 'react';
import { Download } from 'lucide-react';
import { getDownloadQualityPref, setDownloadQualityPref } from '../../utils/cloudinaryDownload';
import { SettingsPageShell, Card, RadioRow, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

export default function ArchivingDownloadsPage() {
  const [quality, setQuality] = useState(getDownloadQualityPref());

  const choose = (v) => {
    setQuality(v);
    setDownloadQualityPref(v);
    toast.success('Updated');
  };

  return (
    <SettingsPageShell title="Archiving and downloading">
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Download size={18} color="var(--text-secondary)" />
          <div style={{ fontWeight: 700, fontSize: 14 }}>Reel downloads</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          When you download a reel from the Share sheet, it includes a small
          "UChat @creator" watermark in the corner. Choose the quality below.
        </div>
      </Card>

      <CardLabel>Download quality</CardLabel>
      <Card>
        <RadioRow
          label="Same quality"
          desc="Download at the original upload quality"
          selected={quality === 'same'}
          onClick={() => choose('same')}
        />
        <RadioRow
          label="Lowest quality"
          desc="Smaller file size, faster download"
          selected={quality === 'lowest'}
          onClick={() => choose('lowest')}
          last
        />
      </Card>
    </SettingsPageShell>
  );
}
