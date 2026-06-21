// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import ReelsPage from './pages/ReelsPage';
import ReelPage from './pages/ReelPage';
import SearchPage from './pages/SearchPage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import PostPage from './pages/PostPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import AccountsCenterPage from './pages/settings/AccountsCenterPage';
import SavedReelsPage from './pages/settings/SavedReelsPage';
import TimeManagementPage from './pages/settings/TimeManagementPage';
import AccountPrivacyPage from './pages/settings/AccountPrivacyPage';
import CloseFriendsPage from './pages/settings/CloseFriendsPage';
import StoryPrivacyPage from './pages/settings/StoryPrivacyPage';
import ActivityStatusPage from './pages/settings/ActivityStatusPage';
import InviteFriendsPage from './pages/settings/InviteFriendsPage';
import BlockedAccountsPage from './pages/settings/BlockedAccountsPage';
import ArchivingDownloadsPage from './pages/settings/ArchivingDownloadsPage';
import DataUsagePage from './pages/settings/DataUsagePage';
import AppPermissionsPage from './pages/settings/AppPermissionsPage';
import AccountToolsPage from './pages/settings/AccountToolsPage';
import VerifiedSubscriptionPage from './pages/settings/VerifiedSubscriptionPage';
import SecurityPage from './pages/settings/SecurityPage';
import SupportPage from './pages/settings/SupportPage';
import AccountStatusPage from './pages/settings/AccountStatusPage';
import GuidelinesPage from './pages/settings/GuidelinesPage';
import AboutPage from './pages/settings/AboutPage';
import NotFoundPage from './pages/NotFoundPage';
import AppLayout from './components/layout/AppLayout';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isProfileComplete, loading, isAdmin, isBanned, isGuest } = useAuth();
  if (loading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (isBanned) return <BannedScreen />;
  // Guests skip onboarding entirely
  if (!isGuest && !isProfileComplete && window.location.pathname !== '/onboarding')
    return <Navigate to="/onboarding" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isProfileComplete, loading, isGuest } = useAuth();
  if (loading) return <AppLoader />;
  if (isAuthenticated && (isProfileComplete || isGuest)) return <Navigate to="/" replace />;
  if (isAuthenticated && !isProfileComplete && !isGuest) return <Navigate to="/onboarding" replace />;
  return children;
};

export const AppLoader = () => (
  <div className="app-loader">
    <div className="app-loader-logo">U</div>
    <div className="app-loader-spinner" />
    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 500 }}>UChat</p>
  </div>
);

const BannedScreen = () => {
  const { userProfile } = useAuth();
  const banUntil = userProfile?.banUntil;
  const isPermanent = banUntil === 'permanent' || !banUntil;
  const banDate = banUntil && !isPermanent ? new Date(banUntil).toLocaleString() : null;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh',
      gap: 16, padding: '24px', textAlign: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>—</div>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Account Suspended</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.6 }}>
        Your account has been suspended for violating UChat's Community Guidelines.
        {banDate && <><br /><br />Ban expires: <strong>{banDate}</strong></>}
        {isPermanent && <><br /><br />This is a <strong>permanent ban</strong>.</>}
        <br /><br />Contact <strong>support.uchat@gmail.com</strong> to appeal.
      </p>
    </div>
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
    <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

    {/* Public shareable reel page — no login required to view */}
    <Route path="/reels/:reelId" element={<ReelPage />} />

    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/" element={<HomePage />} />
      <Route path="/reels" element={<ReelsPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/:chatId" element={<ChatPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:username" element={<ProfilePage />} />
      <Route path="/edit-profile" element={<EditProfilePage />} />
      <Route path="/post/:postId" element={<PostPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/accounts-center" element={<AccountsCenterPage />} />
      <Route path="/settings/saved-reels" element={<SavedReelsPage />} />
      <Route path="/settings/time-management" element={<TimeManagementPage />} />
      <Route path="/settings/privacy" element={<AccountPrivacyPage />} />
      <Route path="/settings/privacy/close-friends" element={<CloseFriendsPage />} />
      <Route path="/settings/story-privacy" element={<StoryPrivacyPage />} />
      <Route path="/settings/activity-status" element={<ActivityStatusPage />} />
      <Route path="/settings/invite-friends" element={<InviteFriendsPage />} />
      <Route path="/settings/blocked" element={<BlockedAccountsPage />} />
      <Route path="/settings/archiving-downloads" element={<ArchivingDownloadsPage />} />
      <Route path="/settings/data-usage" element={<DataUsagePage />} />
      <Route path="/settings/permissions" element={<AppPermissionsPage />} />
      <Route path="/settings/account-tools" element={<AccountToolsPage />} />
      <Route path="/settings/verified" element={<VerifiedSubscriptionPage />} />
      <Route path="/settings/security" element={<SecurityPage />} />
      <Route path="/settings/support" element={<SupportPage />} />
      <Route path="/settings/account-status" element={<AccountStatusPage />} />
      <Route path="/settings/guidelines" element={<GuidelinesPage />} />
      <Route path="/settings/about" element={<AboutPage />} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-center"
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '14px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              boxShadow: 'var(--card-shadow)',
              padding: '10px 16px',
              maxWidth: '90vw',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: 'transparent' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: 'transparent' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
