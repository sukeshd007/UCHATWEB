/**
 * Cloudflare Worker — UChat R2 Media Upload/Serve/Delete
 *
 * Setup:
 *  1. Cloudflare Dashboard → R2 → Create bucket "uchat-media"
 *  2. Workers & Pages → Create Worker → paste this file
 *  3. Worker Settings → Bindings → R2 bucket → name: BUCKET, bucket: uchat-media
 *  4. Set env var ALLOWED_ORIGIN to your app domain (or * for dev)
 *  5. Copy the Worker URL → paste as VITE_R2_WORKER_URL in your .env
 *
 * wrangler.toml is in the same folder if you prefer CLI deploy.
 */

const cors = (env, origin) => ({
  'Access-Control-Allow-Origin':  env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
});

const json = (body, status, env, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env, origin) },
  });

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
          'Content-Type':        obj.httpMetadata?.contentType || 'application/octet-stream',
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

      const publicUrl = `${url.origin}/file/${encodeURIComponent(key)}`;
      return json({ url: publicUrl, key }, 200, env, origin);
    }

    // ── DELETE /delete — remove a file ────────────────────────────────────
    if (request.method === 'DELETE' && url.pathname === '/delete') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, env, origin); }
      const { key } = body;
      if (!key) return json({ error: 'Missing key' }, 400, env, origin);
      await env.BUCKET.delete(key);
      return json({ deleted: key }, 200, env, origin);
    }

    // ── POST /send-notification — broadcast FCM push to all UChat users ────────
    // Body: { title, body, url?, adminSecret }
    // Setup: add FCM_SERVER_KEY and ADMIN_SECRET as env vars in Cloudflare Worker dashboard
    // Get FCM_SERVER_KEY: Firebase Console → Project Settings → Cloud Messaging → Server key
    if (request.method === 'POST' && url.pathname === '/send-notification') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, env, origin); }

      const { title, body: msgBody, url: clickUrl, adminSecret } = body;

      // Protect endpoint with a secret set in Cloudflare dashboard
      if (!env.ADMIN_SECRET || adminSecret !== env.ADMIN_SECRET) {
        return json({ error: 'Unauthorized' }, 401, env, origin);
      }

      if (!title || !msgBody) return json({ error: 'title and body required' }, 400, env, origin);

      const fcmKey = env.FCM_SERVER_KEY;
      if (!fcmKey) return json({ error: 'FCM_SERVER_KEY not configured' }, 500, env, origin);

      const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmKey}`,
        },
        body: JSON.stringify({
          to: '/topics/all',
          notification: {
            title,
            body: msgBody,
            icon: '/icons/icon-192.png',
            click_action: clickUrl || 'https://uchatweb.pages.dev',
          },
          data: { url: clickUrl || '/', type: 'broadcast' },
        }),
      });

      const fcmResult = await fcmRes.json();
      if (fcmRes.ok) return json({ success: true, result: fcmResult }, 200, env, origin);
      return json({ error: 'FCM send failed', details: fcmResult }, 500, env, origin);
    }

    return json({ error: 'Not found' }, 404, env, origin);
  },
};
