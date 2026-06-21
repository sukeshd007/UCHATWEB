// src/pages/settings/AccountPrivacyPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../firebase/firestoreService';
import { SettingsPageShell, Card, RadioRow, MenuRow, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

export default function AccountPrivacyPage() {
  const { uid, userProfile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [isPrivate, setIsPrivate] = useState(userProfile?.isPrivate || false);
  const [saving, setSaving] = useState(false);

  const choose = async (value) => {
    if (isGuest) { toast('Guests can\u2019t change privacy settings'); return; }
    if (value === isPrivate) return;
    setIsPrivate(value);
    setSaving(true);
    try {
      await updateUserProfile(uid, { isPrivate: value });
      toast.success(value ? 'Your account is now private' : 'Your account is now public');
    } catch {
      setIsPrivate(!value);
      toast.error('Could not update \u2014 try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell title="Account privacy">
      <Card>
        <RadioRow
          label="Public"
          desc="Anyone on UChat can see your posts, reels and profile"
          selected={!isPrivate}
          onClick={() => choose(false)}
        />
        <RadioRow
          label="Private"
          desc="Only approved followers can see your posts and reels"
          selected={isPrivate}
          onClick={() => choose(true)}
          last
        />
      </Card>

      <CardLabel>Close Friends</CardLabel>
      <Card>
        <MenuRow
          label="Close Friends"
          desc="Share to a smaller list of people you choose"
          icon={<Users size={17} />}
          onClick={() => navigate('/settings/privacy/close-friends')}
          last
        />
      </Card>
    </SettingsPageShell>
  );
}
