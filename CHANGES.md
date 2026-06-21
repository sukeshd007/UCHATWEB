# UChat — Changelog

## Update: Bug fixes & admin-secret security fix (latest pass)

This pass focused on a specific list of reported-broken features plus one
real security vulnerability found during review. Every item below was
confirmed by reading the actual code path, not guessed — see inline
`BUGFIX`/`SECURITY FIX` comments at each location for the full explanation.

### 🔒 Security

1. **Admin broadcast endpoint trusted a client-bundled secret.**
   `VITE_ADMIN_SECRET` was a Vite env var, which means it was compiled
   straight into the public JS bundle — anyone could read it out of devtools
   and call the Worker's `/send-notification` broadcast endpoint with no
   login at all. Replaced with: the client sends a real Firebase ID token,
   and the Worker verifies it *and* looks up that exact uid's `role` field in
   Firestore server-side before sending anything. No shared secret exists
   anymore — nothing to leak. Changed: `cloudflare-worker/worker.js`,
   `src/pages/AdminPage.jsx`, `.env`, `.env.example`, `wrangler.toml`.
   **If you previously deployed with a real `ADMIN_SECRET`/`VITE_ADMIN_SECRET`
   value, rotate/delete it — treat it as already public.**

### 🐛 Bugs

2. **Voice messages always failed to send.** `sendVoiceMessage` called
   `uploadChatMedia()`, which validates non-video files against an
   image-only whitelist (jpeg/png/gif/webp). An `audio/webm` blob always
   failed that check, so every voice message send threw. Switched to the
   dedicated `uploadVoiceNote()` helper that already existed in
   `storageService.js` but was never wired up.

3. **Voice recorder rebuilt WhatsApp-style.** The old mic button used both
   `onMouseDown/Up` *and* `onTouchStart/End` — on touch devices both fire,
   double-starting the recorder and doubling the timer's speed. Replaced
   with unified Pointer Events (one event model for mouse/touch/pen, no
   double-fire possible), added explicit codec/bitrate selection
   (`audioBitsPerSecond: 128000`, with a Safari/iOS-compatible codec
   fallback — the old code had none and would silently break on iOS), and
   added slide-to-cancel / slide-to-lock gestures with a live waveform.

4. **Voice message playback showed a broken/frozen timer.** Chromium
   reports `duration === Infinity` for MediaRecorder-produced blobs until a
   seek-to-end workaround runs. Added the standard fix in `VoicePlayer`.

5. **"Delete for me" deleted the message from the wrong person's chat.**
   `deleteMessage()` read the message's own `senderId` off the document
   instead of taking the acting user's uid as a parameter — so it always
   hid the message for the *sender*, regardless of who actually clicked
   delete. The receiver's tap did nothing (and was rejected by Firestore
   rules anyway — only the sender/admin could update a message at all,
   `deletedFor` wasn't in the allowed-fields list). Fixed in
   `firestoreService.js`, `firestore.rules`, and the call site in
   `ChatPage.jsx`.

6. **Reels could never be deleted — not even by their owner.** `deleteReel()`
   didn't exist anywhere in the codebase, and reels had no options menu at
   all (no delete, no report, no copy-link). Added `deleteReel()` and a new
   `ReelMenu` component, wired into both `ReelPage.jsx` and `ReelsPage.jsx`.

7. **Comment/repost occasionally appeared to fail even though they'd
   already saved.** `addComment()` awaited its notification + count-increment
   side effects directly with no error handling — if either one had a
   transient failure, the whole call rejected even though the comment was
   already written, so the UI showed "Failed to post comment" and never
   reloaded the list. Those secondary writes are now wrapped so a hiccup in
   a non-critical side effect can't undo a successful primary action
   (matches the pattern `repostReel` already used).

8. **Reel cover image upload showed "✓ Custom thumbnail set" but never
   saved it.** The picked `customThumbnail` file was captured in component
   state and shown as confirmed, but `CreateReelModal`'s submit handler only
   ever sent `thumbnailTime` (the scrub-bar position) to `createReel()` —
   the actual image was discarded. Now it's uploaded via a new
   `uploadReelThumbnail()` helper and saved as `thumbnailUrl`, the same
   field every grid (`HomeReels`, `ProfilePage`, `SavedReelsPage`) already
   expected but never received.

9. **Admin dashboard counters (Total Users, Online, Offline, Pending
   Reports) only loaded once and never updated.** `getPlatformStats()` and
   the online-users query were one-shot fetches on mount / tab-switch.
   Pending reports and online users now use real-time `onSnapshot`
   listeners (push-based, no delay); the aggregate totals (which Firestore
   can't push-update without a server-maintained counter / Cloud Functions)
   now auto-poll every 20s instead of needing a manual page refresh. Also
   added the "Offline" stat that was requested but never existed.

---

## Update: Previous pass (social features, settings, privacy)

### ✅ Fixed bugs

1. **Reels Comment/Share/Save buttons not working.** A full-screen invisible
   tap layer was sitting in front of those buttons (CSS stacking order bug,
   not DOM order) and silently swallowing the clicks. Fixed in `ReelsPage.jsx`.

2. **Repost feature added.** New Repost button on reels (both the main feed
   and the public share page), with a working **Reposts** tab on profiles.
   Saved reels also now actually persist (previously the Save button was
   local-only UI that never wrote anywhere).

3. **Online/offline status.** Previously `lastSeen` was wiped to `null`
   whenever a user went online, making it impossible to detect a "stuck
   online" ghost user (very common on mobile, where the browser/app can die
   without firing any disconnect event). Now `lastSeen` always updates, a
   45-second heartbeat keeps it fresh while the tab is open, and every place
   that shows online status uses a staleness check instead of trusting the
   raw flag.

4. **Messages received but not shown in chat.** The real-time message
   listener had no fallback if its composite Firestore index wasn't fully
   built/deployed — it would fail silently. Added a resilient fallback so
   messages always show up even if the index is still building. **You should
   still confirm the index shows "Enabled"** (not "Building") in Firebase
   Console → Firestore → Indexes, or run `firebase deploy --only firestore:indexes`.

5. **Auth / onboarding always asking for a username again, even for
   registered users.** Several compounding bugs:
   - A stale-closure bug meant old Firestore listeners were never cleaned up
     between auth state changes.
   - An uncaught error during sign-in left the app stuck on the loading
     screen forever — this is what "login successful but never goes to the
     site" looked like.
   - The security rules required new accounts to be created with
     `role == 'user'`, but the two owner emails are created with
     `role: 'owner'` — meaning the **owner account's first-ever login** would
     always fail at the rules level. Fixed.
   - Signing in with Google when you already have an email/password account
     (or vice versa) now shows a clear "you already have an account via X"
     message instead of silently failing or creating a duplicate profile.
   - Returning users who are missing only the newly-added DOB/Gender fields
     now see a non-blocking **"Welcome back!"** checklist (✓ done / ⚠
     pending) instead of being walked through the full new-user wizard again.
   - Signing up with an email that's already registered now auto-switches to
     the Login tab with a friendly "Welcome back" message instead of just an
     error.

6. **Google login succeeds but never enters the app.** Covered by the
   uncaught-error fix above (#5), plus the popup vs. redirect flow on
   desktop/mobile is now handled correctly.

7. **Shared reel/profile links 404.** Added `public/_redirects` (Cloudflare
   Pages / Netlify) and `vercel.json` (Vercel) SPA fallback rules, so a fresh
   page load on a deep link serves the app instead of a host-level 404. (If
   you're on Firebase Hosting, this was already configured correctly.)

### ✨ New features

### Cloudinary storage key rotation (4 accounts ≈ 100GB combined)
Uploads now round-robin across up to 4 Cloudinary accounts and automatically
fail over to the next account if one hits its quota. Configured via `.env`:
`VITE_CLOUDINARY_CLOUD_NAME_1..4` / `VITE_CLOUDINARY_UPLOAD_PRESET_1..4`.

**You need to do this for each of the 3 new accounts** (the cloud names are
already filled in for you in `.env`):
1. Log into each Cloudinary account → Settings → Upload
2. Add an upload preset → set **Signing Mode to "Unsigned"** → name it
   `uchat_uploads` (or update the matching `_PRESET_` var if you use a
   different name) → Save

Only cloud names + unsigned preset names are ever stored in the frontend —
**the API Key/Secret you shared are not used anywhere** and don't need to be
(unsigned uploads don't require them, and putting a secret in a Vite `.env`
would expose it to anyone who opens devtools, since `VITE_`-prefixed vars
ship in the public JS bundle).

### Real push notifications (reach the phone even when the app is fully closed)
The old `/send-notification` Worker endpoint called Google's legacy FCM API,
which was **shut down in 2024** — it was non-functional. Replaced with a
proper FCM HTTP v1 implementation (the Worker signs its own service-account
JWT and exchanges it for an OAuth2 token, using only the Web Crypto API —
no extra libraries). Likes, comments, follows, messages, and reposts now all
trigger a real device push, not just an in-app badge.

**You need to set 4 Cloudflare Worker secrets** (one-time):
```
cd cloudflare-worker
wrangler secret put ADMIN_SECRET
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_CLIENT_EMAIL
wrangler secret put FIREBASE_PRIVATE_KEY
```
Get the last 3 from **Firebase Console → Project Settings → Service Accounts
→ Generate new private key** (downloads a JSON file with exactly those 3
values). Paste the private key including the `BEGIN/END PRIVATE KEY` lines.

Then redeploy the Worker (`wrangler deploy` from `cloudflare-worker/`).

### Notes — now with "Your note" on the Messages page too
The Notes row at the top of Messages previously only showed other people's
notes — there was no way to post your own from that screen. It now reuses
the same component as the Home page, so the "Your note" compose bubble shows
up first, consistently in both places.

### 📋 Still to do (deferred — these are large, standalone features)

These were in your request but are big enough that bundling them into this
same pass would mean shipping all of them at lower quality. Happy to do
these next, one at a time:

- **Real Instagram-style Stories** (full-screen photo/video, 24h expiry,
  progress bar, seen-by tracking) to replace the Notes bar on Home — this is
  a from-scratch feature (new collection, media upload, full-screen viewer),
  distinct from the existing text-only Notes.
- **Reels on the Home feed** as a scrollable section, plus a **reel player
  UI restyle** to match UChat's own design instead of looking like a generic
  video player.
- **Trending, non-copyrighted songs in Notes.**

### ⚙️ Full Settings page (this update)

Every section from your spec is built and wired to real data — not just UI:

- **Accounts Center** — account names, links to security/personal details/permissions
- **Saved reels** — real saved-reels grid
- **Time management** — a genuine per-device usage tracker (Time Limits), with
  a one-time daily reminder when you cross your limit
- **Account privacy** — Public/Private toggle + **Close Friends** list management
  (add/remove from your actual followers)
- **Story, live and location** — Everyone / Followers / Followers you follow
  back / No one
- **Activity in Friends feed** — show/hide your online status (also wired into
  every place online status is displayed app-wide)
- **Follow and invite friends** — real referral links (`?ref=username`),
  invite counting, and an automatic 7-day verified trial at 50 invites
- **Blocked accounts** — real block/unblock, including fixing two backend bugs
  along the way: the "Block" button on profiles was completely fake (just
  showed a toast, blocked nobody), and reels' Comment button was silently
  failing because it tried writing to the wrong Firestore collection
- **Archiving and downloading** — same/lowest quality reel downloads with a
  real "UChat @creator" watermark, rendered server-side via Cloudinary
  (Share sheet → Download)
- **Data usage and media quality** — Data Saver toggle, wired into reels and
  post media across the app
- **App and website permissions** — push notification toggle + live camera/mic/
  location permission status
- **Account type and tools** — real 30-day analytics (views/likes/comments/
  shares/reposts, queried from actual interaction data, not estimates), trial
  reel and monetization eligibility based on your real follower count and age
- **UChat Verified** — ₹299/month, with an honest "payment not connected yet"
  state rather than a fake checkout (see payment note below)
- **Support** — feedback form + FAQ
- **Account Status** — Verified/Banned/Active, pulled from your real account state
- **Privacy & Community Guidelines**, **About**

**One thing flagged in advance:** the ₹299 subscription and "pay for reach"
Ads can't charge real money without your own payment gateway (e.g. Razorpay)
credentials connected — I've built the full UI and state machine for both,
but the "Subscribe"/"Boost" buttons are honest about payment not being wired
up yet rather than pretending to process a charge.

**Deployment reminder:** this update adds new Firestore rules (for `shares`,
`reposts`, invite-crediting, and block/unfollow) and several new composite
indexes (for the analytics queries). Run both before testing:
```
firebase deploy --only firestore:rules,firestore:indexes
```
