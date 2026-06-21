// src/pages/settings/ActivityStatusPage.jsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../firebase/firestoreService';
import { SettingsPageShell, Card, ToggleRow } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

export default function ActivityStatusPage() {
  const { uid, userProfile, isGuest } = useAuth();
  const [visible, setVisible] = useState(userProfile?.activityStatusVisible !== false);

  const toggle = async () => {
    if (isGuest) { toast('Guests can\u2019t change this setting'); return; }
    const v = !visible;
    setVisible(v);
    try {
      await updateUserProfile(uid, { activityStatusVisible: v });
      toast.success(v ? 'Activity status is now visible to others' : 'Activity status is now hidden');
    } catch {
      setVisible(!v);
      toast.error('Could not update \u2014 try again');
    }
  };

  return (
    <SettingsPageShell title="Activity in Friends feed">
      <Card>
        <ToggleRow
          label="Show activity status"
          desc="Let people you follow and message with see when you were last active or are currently online. If you turn this off, you won\u2019t be able to see others\u2019 activity status either."
          value={visible}
          onChange={toggle}
          last
        />
      </Card>
    </SettingsPageShell>
  );
}
