# 🟣 UChat — Production Social Media Platform

A full-stack, production-ready social media application built with React + Firebase, inspired by Instagram, Threads, Messenger, and WhatsApp.

---

## ✨ Features

| Category | Features |
|---|---|
| **Auth** | Email/Password, Google, Phone OTP, Guest, Email Verification, Password Reset |
| **Profiles** | Avatar, Cover Photo, Bio, Website, Private/Public, Verified Badge |
| **Posts** | Single/Multi-image, Video, Carousel, Captions, Hashtags, Location, Like/Comment/Save/Share |
| **Reels** | Full-screen vertical feed, Upload, Like/Comment, View Count, Max 2 min |
| **Messaging** | 1:1 & Group chats, Images, Videos, Voice, Reactions, Replies, Seen status |
| **Notes** | 24-hour status notes above chats |
| **Calls** | WebRTC Voice & Video Calls, Firebase signaling, Duration timer |
| **Notifications** | Likes, Comments, Follows, Mentions, Messages, Calls |
| **Search** | Users, Hashtags, Trending, Explore grid |
| **Admin Panel** | Reports, User management, Banning, Verification |
| **Owner Panel** | Full platform control, Role promotion, Stats dashboard |
| **Design** | Dark/Light mode, Mobile-first, Animations, Instagram-level UI |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd uchat
cp .env.example .env.local
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable these services:
   - **Authentication** → Sign-in Methods: Email/Password, Google, Phone
   - **Firestore Database** → Start in production mode
   - **Storage** → Start in production mode
   - **Hosting** (optional, for deployment)

4. Go to **Project Settings → Your Apps → Add Web App**
5. Copy the config values into `.env.local`

### 3. Deploy Security Rules
```bash
npm install -g firebase-tools
firebase login
firebase init   # Select Firestore, Storage, Hosting
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### 4. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔑 First-Time Owner Setup

1. Register at `/auth` with email: `support.uchat@gmail.com`
2. Complete onboarding (choose username, name, photo)
3. You'll automatically have full **Owner Panel** access at `/admin`

---

## 📁 Project Structure

```
uchat/
├── src/
│   ├── components/
│   │   ├── auth/          # Auth components
│   │   ├── calls/         # WebRTC calling (CallModal, IncomingCallHandler)
│   │   ├── common/        # Shared: Avatar
│   │   ├── feed/          # StoryBar, SuggestedUsers
│   │   ├── layout/        # AppLayout, TopNav, SideNav, BottomNav
│   │   ├── posts/         # PostCard, CreatePostModal, CommentSheet, PostMenu
│   │   └── reels/         # CreateReelModal
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Global auth state + owner/admin detection
│   │   └── ThemeContext.jsx   # Dark/light mode
│   ├── firebase/
│   │   ├── config.js          # Firebase initialization
│   │   ├── authService.js     # All auth operations
│   │   ├── firestoreService.js # All database operations
│   │   └── storageService.js  # All file upload operations
│   ├── hooks/
│   │   └── useNotifications.js
│   ├── pages/
│   │   ├── AuthPage.jsx
│   │   ├── OnboardingPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── ReelsPage.jsx
│   │   ├── SearchPage.jsx
│   │   ├── MessagesPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── EditProfilePage.jsx
│   │   ├── NotificationsPage.jsx
│   │   ├── PostPage.jsx
│   │   ├── AdminPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── styles/
│   │   └── globals.css    # CSS design tokens + global styles
│   ├── App.jsx            # Root router + providers
│   └── main.jsx           # Entry point
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Composite query indexes
├── storage.rules          # Storage security rules
├── firebase.json          # Firebase hosting config
└── vite.config.js
```

---

## 🗄️ Firestore Schema

### `users/{uid}`
```json
{
  "uid": "string",
  "username": "string (unique, lowercase)",
  "displayName": "string",
  "email": "string",
  "profilePhoto": "string (URL)",
  "coverPhoto": "string (URL)",
  "bio": "string",
  "website": "string",
  "verified": "boolean",
  "role": "user | admin | owner",
  "banned": "boolean",
  "blacklisted": "boolean",
  "isPrivate": "boolean",
  "onlineStatus": "boolean",
  "lastSeen": "timestamp",
  "followersCount": "number",
  "followingCount": "number",
  "postsCount": "number",
  "reelsCount": "number",
  "profileSetupComplete": "boolean",
  "createdAt": "timestamp"
}
```

### `posts/{postId}`
```json
{
  "authorId": "string",
  "mediaUrls": ["string"],
  "mediaType": "image | video",
  "caption": "string",
  "hashtags": ["string"],
  "location": "string",
  "likesCount": "number",
  "commentsCount": "number",
  "createdAt": "timestamp"
}
```

### `chats/{chatId}` — `messages/{msgId}` — `calls/{callId}` etc.
See `src/firebase/firestoreService.js` for full schemas.

---

## 🌐 Deploy to Firebase Hosting

```bash
npm run build
firebase deploy
```

Your app will be live at `https://your-project-id.web.app`

---

## 🔒 Security Architecture

- **Firestore rules** enforce ownership, role-based access, and prevent privilege escalation
- **Storage rules** restrict file types and enforce per-user paths  
- **Owner account** (`support.uchat@gmail.com`) has immutable super-admin privileges
- **Admins** can moderate content but cannot promote other admins (owner-only)
- **Banned users** are blocked from creating content at the database rule level
- **WebRTC signaling** goes through Firestore with participant-only access

---

## 📱 Mobile & PWA

The app is fully responsive with:
- Mobile-first bottom navigation
- `100dvh` viewport units for iOS compatibility
- `safe-area-inset` padding for notched devices
- Touch-optimized interactions (swipe reels, double-tap to like)

---

## 🛣️ Roadmap

- [ ] Push Notifications (FCM)
- [ ] Stories (24h photo/video)
- [ ] DM Voice Messages recording
- [ ] Post scheduling
- [ ] Analytics dashboard
- [ ] Native Android/iOS (React Native port)
- [ ] Content CDN integration
- [ ] Video transcoding (Cloud Functions)
