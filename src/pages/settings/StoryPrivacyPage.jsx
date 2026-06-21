// src/pages/settings/StoryPrivacyPage.jsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../firebase/firestoreService';
import { SettingsPageShell, Card, RadioRow, CardLabel } from '../../components/settings/SettingsUI';
import toast from 'react-hot-toast';

const OPTIONS = [
  { value: 'everyone', label: 'Everyone', desc: 'Anyone on UChat can view your story, live and location' },
  { value: 'followers', label: 'Followers', desc: 'Only people who follow you' },
  { value: 'followers_you_follow_back', label: 'Followers you follow back', desc: 'Only mutual followers' },
  { value: 'no_one', label: 'No one', desc: 'Hide your story, live and location from everyone' },
];

export default function StoryPrivacyPage() {
  const { uid, userProfile, isGuest } = useAuth();
  const [value, setValue] = useState(userProfile?.storyVisibility || 'followers');

  const choose = async (v) => {
    if (isGuest) { toast('Guests can\u2019t change this setting'); return; }
    if (v === value) return;
    setValue(v);
    try {
      await updateUserProfile(uid, { storyVisibility: v });
      toast.success('Updated');
    } catch {
      toast.error('Could not update \u2014 try again');
    }
  };

  return (
    <SettingsPageShell title="Story, live and location" subtitle="Who can view your story, live video and location">
      <CardLabel>Who can view</CardLabel>
      <Card>
        {OPTIONS.map((opt, i) => (
          <RadioRow
            key={opt.value}
            label={opt.label}
            desc={opt.desc}
            selected={value === opt.value}
            onClick={() => choose(opt.value)}
            last={i === OPTIONS.length - 1}
          />
        ))}
      </Card>
    </SettingsPageShell>
  );
}
