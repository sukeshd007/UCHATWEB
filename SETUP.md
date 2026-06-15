# UChat Setup Guide

## What changed
- **Firebase Storage: completely removed.** Zero storage costs from Firebase.
- **Cloudflare R2:** all photos, videos, voice notes, reels go here (10GB free, no egress fees).
- **Offline-first:** every message and every piece of media you receive is saved to IndexedDB on your device. The app loads from local cache instantly, even with no internet.
- **Outbox:** if you send a message while offline, it queues locally and sends automatically when you reconnect.
- **Service Worker:** caches the app shell + all R2 media files so everything works offline.
- **Verified badge:** now matches Instagram's exact starburst shape.

---

## Step 1 — Enable Firebase Auth (login fix)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → your project **uchatsite**
2. Authentication → Sign-in method → Enable:
   - **Email/Password** ✓
   - **Google** ✓
   - **Phone** ✓ (requires billing enabled on Firebase, but it's free up to 10k/month)
   - **Anonymous** ✓
3. Authentication → Settings → Authorized domains → Add your deployed domain

That's all Firebase needs. No Storage setup required.

---

## Step 2 — Set up Cloudflare R2 (5 minutes)

1. Sign up / log in at [cloudflare.com](https://cloudflare.com) (free account is fine)
2. Left sidebar → **R2 Object Storage** → **Create bucket**
   - Name: `uchat-media`
   - Region: Auto (or pick closest to your users)
3. Left sidebar → **Workers & Pages** → **Create application** → **Create Worker**
   - Click **Deploy** (ignore the default code for now)
   - Then click **Edit code**, replace everything with the contents of `cloudflare-worker/worker.js`
   - **Deploy** again
4. In the Worker settings → **Settings** → **Bindings** → **Add binding**
   - Type: **R2 bucket**
   - Variable name: `BUCKET`
   - R2 bucket: `uchat-media`
   - Save
5. Still in Settings → **Variables** → add:
   - `ALLOWED_ORIGIN` = `https://your-app-domain.com` (or `*` for testing)
6. Copy your Worker URL (shown at top, like `https://uchat-r2-worker.yourname.workers.dev`)
7. Open `.env` and set:
   ```
   VITE_R2_WORKER_URL=https://uchat-r2-worker.yourname.workers.dev
   ```

---

## Step 3 — Build & Deploy

```bash
npm install
npm run build
# deploy the `dist/` folder to Cloudflare Pages, Vercel, or any static host
```

For Cloudflare Pages (recommended — free, fast):
- Workers & Pages → Pages → Connect to Git → pick your repo
- Build command: `npm run build`
- Output directory: `dist`
- Add all your `.env` variables under Settings → Environment variables

---

## Free tier limits

| Service | Free limit |
|---|---|
| Firebase Auth | 10,000 sign-ins/month |
| Firestore | 1GB storage, 50k reads/day, 20k writes/day |
| Cloudflare R2 | **10GB storage**, 1M uploads/month, 10M downloads/month |
| Cloudflare Workers | 100,000 requests/day |
| Cloudflare Pages | Unlimited requests |

**You need ZERO paid tiers to run UChat.** Only pay if you grow beyond these.

---

## API keys checklist

| Key | Status |
|---|---|
| Firebase API Key | ✅ Already in .env |
| Firebase Auth Domain | ✅ Already in .env |
| Firebase Project ID | ✅ Already in .env |
| Firebase App ID | ✅ Already in .env |
| Cloudflare R2 Worker URL | ⚠️ Add after Step 2 above |

That's it — only ONE more thing to add.
