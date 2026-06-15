// src/components/common/SaveToDeviceButton.jsx
// Saves received media to the user's device AND caches in IndexedDB for offline.
import { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { saveMediaBlob } from '../../utils/localDB';
import toast from 'react-hot-toast';

export default function SaveToDeviceButton({ url, filename, style = {} }) {
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Fetch blob, cache locally in IndexedDB, AND download to device
      const res  = await fetch(url);
      const blob = await res.blob();
      await saveMediaBlob(url, blob); // offline cache

      // Trigger download to device
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      setSaved(true);
      toast.success('Saved to your device!');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Could not save file');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button onClick={handleSave} disabled={saving || saved} title="Save to device"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: saving || saved ? 'default' : 'pointer', fontSize: 11, fontWeight: 600, background: saved ? '#22c55e' : 'rgba(0,0,0,0.45)', color: 'white', backdropFilter: 'blur(4px)', transition: 'background 0.2s', ...style }}>
      {saved ? <Check size={12} /> : <Download size={12} />}
      {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
    </button>
  );
}
