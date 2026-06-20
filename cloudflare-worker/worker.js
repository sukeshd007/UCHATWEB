/**
 * Cloudflare Worker — UChat R2 Media Upload/Serve/Delete + Push Notifications
 *
 * ── R2 Media setup ─────────────────────────────────────────────────────────
 *  1. Cloudflare Dashboard → R2 → Create bucket "uchat-media"
 *  2. Workers & Pages → Create Worker → paste this file
 *  3. Worker Settings → Bindings → R2 bucket → name: BUCKET, bucket: uchat-media
 *  4. Set env var ALLOWED_ORIGIN to your app domain (or * for dev)
 *  5. Copy the Worker URL → paste as VITE_R2_WORKER_URL in your .env
 *
 * ── Push notification setup (FCM HTTP v1 — the legacy `fcm.googleapis.com/fcm/send`
 *    API was shut down in 2024, so this Worker signs its own service-account
 *    JWT with the Web Crypto API and exchanges it for an OAuth2 access token —
 *    no external libraries needed, works natively on Workers) ─────────────────
 *  1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *     (downloads a JSON file with client_email, private_key, project_id)
 *  2. Set these as Worker SECRETS (never as plain vars — keeps them out of the
 *     dashboard UI and `wrangler.toml`):
 *       wrangler secret put FIREBASE_PROJECT_ID
 *       wrangler secret put FIREBASE_CLIENT_EMAIL
 *       wrangler secret put FIREBASE_PRIVATE_KEY     (paste the full PEM, including
 *                                                       -----BEGIN/END PRIVATE KEY-----)
 *       wrangler secret put ADMIN_SECRET             (already used by /send-notification)
 *  3. That's it — /send-push and /send-notification will start working.
 *
 * wrangler.toml is in the same folder if you prefer CLI deploy.
 */

const cors = (env, origin) => ({
  'Access-Control-Allow-Origin':  env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age':       '86400',
});

const json = (body, status, env, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env, origin) },
  });

// ─── base64url helpers ────────────────────────────────────────────────────────

function base64urlFromString(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlFromBuffer(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToArrayBuffer(b64url) {
  const pad = (4 - (b64url.length % 4)) % 4;
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// PEM (PKCS8) -> raw DER ArrayBuffer for crypto.subtle.importKey.
// Handles both real newlines and literal "\n" (common when pasting a
// multi-line key into a single-line Worker secret value).
function pemToArrayBuffer(pem) {
  const lines = pem
    .replace(/\\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('-----'));
  const b64 = lines.join('');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ─── Service-account JWT signing + OAuth2 token exchange ─────────────────────
// Replaces the dead `Authorization: key=<server key>` legacy auth with a
// properly signed RS256 JWT exchanged for a short-lived OAuth2 access token —
// this is what FCM HTTP v1 requires.

let cachedAccessToken = null; // { token, expiresAt } — reused across requests within the same isolate

async function createServiceAccountJWT(env) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = base64urlFromString(JSON.stringify(header)) + '.' + base64urlFromString(JSON.stringify(claims));

  const keyData = pemToArrayBuffer(env.FIREBASE_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  return signingInput + '.' + base64urlFromBuffer(signature);
}

async function getAccessToken(env) {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
    return cachedAccessToken.token;
  }
  const jwt = await createServiceAccountJWT(env);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Failed to obtain FCM access token');
  cachedAccessToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

async function sendFcmV1(env, message) {
  const accessToken = await getAccessToken(env);
  const res = await fetch('https://fcm.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/messages:send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || 'FCM send failed');
  return data;
}

// ─── Firebase ID token verification ───────────────────────────────────────────
// Confirms the request actually comes from a logged-in UChat user before
// letting them trigger a push send — mitigates spam/abuse of the endpoint.

let cachedJwks = null; // { keys: {kid: jwk}, fetchedAt }

async function getGoogleJwks() {
  const now = Date.now();
  if (cachedJwks && now - cachedJwks.fetchedAt < 3600 * 1000) return cachedJwks.keys;
  const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  const data = await res.json();
  const keys = {};
  for (const jwk of (data.keys || [])) keys[jwk.kid] = jwk;
  cachedJwks = { keys, fetchedAt: now };
  return keys;
}

async function verifyFirebaseIdToken(idToken, projectId) {
  const parts = (idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const encHeader = parts[0], encPayload = parts[1], encSig = parts[2];
  const header = JSON.parse(new TextDecoder().decode(base64urlToArrayBuffer(encHeader)));
  const payload = JSON.parse(new TextDecoder().decode(base64urlToArrayBuffer(encPayload)));

  if (header.alg !== 'RS256') throw new Error('Unexpected signing algorithm');

  const jwks = await getGoogleJwks();
  const jwk = jwks[header.kid];
  if (!jwk) throw new Error('Unknown signing key (token may be stale — try refreshing the app)');

  const cryptoKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64urlToArrayBuffer(encSig),
    new TextEncoder().encode(encHeader + '.' + encPayload)
  );
  if (!valid) throw new Error('Invalid signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Token expired');
  if (payload.aud !== projectId) throw new Error('Token audience mismatch');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('Token issuer mismatch');
  if (!payload.sub) throw new Error('Token missing subject');

  return payload; // payload.sub is the Firebase uid
}

const hasServiceAccount = (env) =>
  !!(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors(env, origin) });

    // ── GET /file/<key> — serve a stored file ─────────────────────────────
    if (request.method === 'GET' && url.pathname.startsWith('/file/')) {
      const key = decodeURIComponent(url.pathname.slice('/file/'.length));
      if (!key || key.includes('..'))
        return json({ error: 'Bad key' }, 400, env, origin);

      const obj = await env.BUCKET.get(key);
      if (!obj) return json({ error: 'Not found' }, 404, env, origin);

      return new Response(obj.body, {
        headers: {
          'Content-Type':        (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream',
          // Cache for 1 year — files are content-addressed (UUID filenames)
          'Cache-Control':       'public, max-age=31536000, immutable',
          'Content-Disposition': 'inline',
          ...cors(env, origin),
        },
      });
    }

    // ── POST /upload — receive a file and store in R2 ─────────────────────
    if (request.method === 'POST' && url.pathname === '/upload') {
      let formData;
      try { formData = await request.formData(); }
      catch { return json({ error: 'Invalid form data' }, 400, env, origin); }

      const file = formData.get('file');
      const key  = formData.get('key');
      if (!file || !key) return json({ error: 'Missing file or key' }, 400, env, origin);
      if (key.includes('..') || key.startsWith('/')) return json({ error: 'Invalid key' }, 400, env, origin);

      const buf = await file.arrayBuffer();
      await env.BUCKET.put(key, buf, {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });

      const publicUrl = url.origin + '/file/' + encodeURIComponent(key);
      return json({ url: publicUrl, key }, 200, env, origin);
    }

    // ── DELETE /delete — remove a file ────────────────────────────────────
    if (request.method === 'DELETE' && url.pathname === '/delete') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, env, origin); }
      const key = body.key;
      if (!key) return json({ error: 'Missing key' }, 400, env, origin);
      await env.BUCKET.delete(key);
      return json({ deleted: key }, 200, env, origin);
    }

    // ── POST /send-push — push a notification to ONE user's device(s) ──────
    // Body: { idToken, token, title, body, data? }
    // `idToken` is the caller's Firebase ID token (proves they're a real
    // logged-in UChat user). `token` is the RECIPIENT's FCM device token,
    // already known to the client (read from the recipient's user doc).
    // This sends straight to a single device via FCM HTTP v1, including when
    // the recipient's app/site is fully closed — that's the whole point of
    // using a real push service instead of an in-app listener.
    if (request.method === 'POST' && url.pathname === '/send-push') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, env, origin); }
      const { idToken, token, title, body: msgBody, data } = body;

      if (!hasServiceAccount(env)) {
        return json({ error: 'Push not configured on the server (missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY secrets)' }, 500, env, origin);
      }
      if (!idToken) return json({ error: 'idToken required' }, 401, env, origin);
      if (!token || !title || !msgBody) return json({ error: 'token, title and body are required' }, 400, env, origin);

      try {
        await verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID);
      } catch (e) {
        return json({ error: 'Unauthorized: ' + e.message }, 401, env, origin);
      }

      try {
        const stringData = {};
        for (const k in (data || {})) stringData[k] = String(data[k]);

        const result = await sendFcmV1(env, {
          token,
          notification: { title, body: msgBody },
          webpush: {
            notification: { icon: '/icons/icon-192.png', badge: '/icons/icon-72.png' },
            fcm_options: { link: (data && data.url) || '/' },
          },
          data: stringData,
        });
        return json({ success: true, result }, 200, env, origin);
      } catch (e) {
        return json({ error: e.message }, 500, env, origin);
      }
    }

    // ── POST /subscribe-topic — subscribe a device token to a topic (e.g. "all") ──
    // Body: { idToken, token, topic }
    // Used so admin broadcasts (/send-notification) can reach every device via
    // a single topic send, without the client ever needing direct FCM
    // server-key access (which is what the old, broken implementation did).
    if (request.method === 'POST' && url.pathname === '/subscribe-topic') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, env, origin); }
      const { idToken, token, topic } = body;

      if (!hasServiceAccount(env)) {
        return json({ error: 'Push not configured on the server' }, 500, env, origin);
      }
      if (!idToken || !token || !topic) return json({ error: 'idToken, token and topic are required' }, 400, env, origin);

      try {
        await verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID);
      } catch (e) {
        return json({ error: 'Unauthorized: ' + e.message }, 401, env, origin);
      }

      try {
        const accessToken = await getAccessToken(env);
        const res = await fetch('https://iid.googleapis.com/iid/v1/' + token + '/rel/topics/' + topic, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || ('Topic subscribe failed (' + res.status + ')'));
        }
        return json({ success: true }, 200, env, origin);
      } catch (e) {
        return json({ error: e.message }, 500, env, origin);
      }
    }

    // ── POST /send-notification — broadcast push to all UChat users ────────
    // Body: { title, body, url?, adminSecret }
    // Same request contract as before, but now uses FCM HTTP v1 under the
    // hood — the legacy `fcm.googleapis.com/fcm/send` API this used to call
    // was shut down in 2024, so this endpoint was silently non-functional
    // until this fix.
    if (request.method === 'POST' && url.pathname === '/send-notification') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, env, origin); }

      const { title, body: msgBody, url: clickUrl, adminSecret } = body;

      if (!env.ADMIN_SECRET || adminSecret !== env.ADMIN_SECRET) {
        return json({ error: 'Unauthorized' }, 401, env, origin);
      }
      if (!title || !msgBody) return json({ error: 'title and body required' }, 400, env, origin);
      if (!hasServiceAccount(env)) {
        return json({ error: 'Push not configured on the server (missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY secrets)' }, 500, env, origin);
      }

      try {
        const result = await sendFcmV1(env, {
          topic: 'all',
          notification: { title, body: msgBody },
          webpush: {
            notification: { icon: '/icons/icon-192.png' },
            fcm_options: { link: clickUrl || '/' },
          },
          data: { url: clickUrl || '/', type: 'broadcast' },
        });
        return json({ success: true, result }, 200, env, origin);
      } catch (e) {
        return json({ error: e.message }, 500, env, origin);
      }
    }

    return json({ error: 'Not found' }, 404, env, origin);
  },
};
