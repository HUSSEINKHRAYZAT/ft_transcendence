// google-oauth2/src/routes/auth.routes.ts
import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { signState, verifyState } from '../utils/state';
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';

// HTML helpers
function htmlError(title: string, detail?: string) {
  const safe = (s?: string) => (s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${safe(title)}</title></head><body><h1>${safe(title)}</h1><pre>${safe(detail)}</pre></body></html>`;
}
function htmlRedirect(to: string) {
  const js = JSON.stringify(to);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Redirecting…</title></head>
<body><p>Completing sign-in… If you're not redirected automatically, <a href="${to}">click here</a>.</p>
<script>location.replace(${js});</script></body></html>`;
}

// Promise wrapper for jwt.sign
function signJwt(payload: object, secret: Secret, options: SignOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, options, (err, token) => {
      if (err || !token) return reject(err ?? new Error('sign_failed'));
      resolve(token);
    });
  });
}

const routes: FastifyPluginAsync = async (app) => {
  // GET /authWithGoogle/start?redirectTo=<frontend_url>
  app.get('/start', {
    schema: { querystring: Type.Object({ redirectTo: Type.String() }), summary: 'Redirect user to Google OAuth consent screen' },
  }, async (req, reply) => {
    const { redirectTo } = req.query as { redirectTo: string };

    const allowed = app.config.ALLOWED_REDIRECTS.split(',').map(s => s.trim());
    if (!allowed.some(pfx => redirectTo.startsWith(pfx))) {
      app.log.warn({ redirectTo, allowed }, 'redirect not allowed');
      return reply.code(400).type('text/html').send(htmlError('redirect not allowed'));
    }

    const state = signState(app.config.STATE_SECRET, { redirectTo, ts: Date.now() });

    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', app.config.GOOGLE_CLIENT_ID);
    u.searchParams.set('redirect_uri', app.config.GOOGLE_REDIRECT_URI);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'openid email profile');
    u.searchParams.set('state', state);
    u.searchParams.set('prompt', 'consent');
    u.searchParams.set('access_type', 'offline');

    // Correct order: statusCode first, then URL
    return reply.redirect(u.toString(), 302);
  });

  // GET /authWithGoogle/callback?code=...&state=...
  app.get('/callback', {
    schema: { querystring: Type.Object({ code: Type.String(), state: Type.String() }), summary: 'Handle Google callback, upsert, mint JWT, and redirect' },
  }, async (req, reply) => {
    const { code, state } = req.query as { code: string; state: string };

    // 1) verify state
    let st: { redirectTo: string; ts: number };
    try { st = verifyState(app.config.STATE_SECRET, state); }
    catch { return reply.code(400).type('text/html').send(htmlError('invalid_state')); }

    // 2) exchange code → tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: app.config.GOOGLE_CLIENT_ID,
        client_secret: app.config.GOOGLE_CLIENT_SECRET,
        redirect_uri: app.config.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text(); app.log.error({ txt }, 'google token exchange failed');
      return reply.code(502).type('text/html').send(htmlError('google_exchange_failed'));
    }
    const tokens = await tokenRes.json() as { access_token: string };

    // 3) fetch profile
    const profRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profRes.ok) {
      const txt = await profRes.text(); app.log.error({ txt }, 'google profile fetch failed');
      return reply.code(502).type('text/html').send(htmlError('google_profile_failed'));
    }
    const profile = await profRes.json() as {
      sub: string; email: string; email_verified?: boolean;
      name?: string; given_name?: string; family_name?: string; picture?: string;
    };

    const email = profile.email;
    const firstName = profile.given_name || profile.name?.split(' ')[0] || 'User';
    const lastName  = profile.family_name || profile.name?.split(' ').slice(1).join(' ') || '';
    const namePart = lastName 
    ? firstName.charAt(0) + lastName 
    : firstName;
    const cleanedName = namePart.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 21);
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const baseUsername = cleanedName + randomDigits;

    // 4) upsert in user-management
    const upsertRes = await fetch(`${app.config.USER_SERVICE_URL}/users/oauth-upsert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email, firstName, lastName, username: baseUsername, profilePath: profile.picture, status: 'active',
      }),
    });
    if (!upsertRes.ok) {
      const txt = await upsertRes.text(); app.log.error({ txt }, 'oauth upsert failed');
      return reply.code(502).type('text/html').send(htmlError('upsert_failed'));
    }
    const user = await upsertRes.json();

    // 5) sign JWT — build SignOptions without undefined
    const signOpts: SignOptions = {
      // AUTH_JWT_TTL is required (e.g., '15m' or 900)
      expiresIn: app.config.AUTH_JWT_TTL as unknown as NonNullable<SignOptions['expiresIn']>,
    };

    const token = await signJwt(
      { sub: user.id, username: user.username, email: user.email },
      app.config.AUTH_JWT_SECRET as Secret,
      signOpts
    );

    // 6) HTML redirect back to frontend
    const redirectUrl = `${st.redirectTo}#token=${encodeURIComponent(token)}`;
    return reply.type('text/html').send(htmlRedirect(redirectUrl));
  });
};

export default routes;
