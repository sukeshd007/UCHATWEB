# UChat — Changes in this update

This document covers everything fixed/added in this pass, plus exactly what
you need to configure for it all to work in production.

## ✅ Fixed bugs

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

## ✨ New features

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

## 📋 Still to do (deferred — these are large, standalone features)

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
- **The full Instagram-style Settings page** (Accounts Center, Time Limits,
  Privacy/Close Friends, Story/Live visibility, Activity status, the
  50-invites verified-badge program, Blocked accounts, watermarked/quality
  downloads, Data Saver, App permissions, the 30-day analytics dashboard,
  Trial-reel/Monetization eligibility, Ads, and UChat Verified). One note on
  this in advance: the ₹299 Verified subscription and "pay for reach" Ads
  can't actually charge real money without your own payment gateway (e.g.
  Razorpay) credentials — I can build all the UI/UX and non-payment logic,
  but the payment integration itself needs your merchant account details
  when we get there.
