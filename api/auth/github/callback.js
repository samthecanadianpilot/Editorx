// Vercel serverless function: handles the OAuth redirect back from GitHub.
//
// Flow:
//   1. /api/auth/github/start  → 302 to GitHub authorize (sets state cookie)
//   2. GitHub                  → 302 back here with ?code & ?state
//   3. This handler validates state, exchanges code → token, fetches user,
//      and mints a signed HTTP-only session cookie. Then 302 to /.
//   4. /api/me returns the session payload to the frontend.
//
// Required env vars:
//   GH_CLIENT_ID, GH_CLIENT_SECRET  — for OAuth
//   SESSION_SECRET                  — long random string for signing sessions
//                                     (falls back to GH_CLIENT_SECRET if unset)

import { mintSession, setSessionCookie, getSessionSecret } from '../../_lib/session.js';

export default async function handler(req, res) {
  const clientId     = process.env.GH_CLIENT_ID;
  const clientSecret = process.env.GH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return sendError(res, 500, 'GitHub OAuth is not configured',
      'This deployment is missing <code>GH_CLIENT_ID</code> or <code>GH_CLIENT_SECRET</code>. ' +
      'Add both in Vercel → Settings → Environment Variables, redeploy, and try again.');
  }

  const { code, state, error, error_description } = req.query || {};
  if (error) {
    return sendError(res, 400, 'GitHub returned an error',
      `<code>${escapeHtml(error)}</code> — ${escapeHtml(error_description || 'no description')}.`);
  }
  if (!code || !state) {
    return sendError(res, 400, 'Missing OAuth parameters',
      'GitHub didn\'t return both <code>code</code> and <code>state</code>. Start sign-in again.');
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.gh_oauth_state !== state) {
    return sendError(res, 400, 'OAuth state mismatch',
      'The CSRF state cookie didn\'t match — your sign-in may have expired (cookies last 10 minutes). Try again.');
  }

  // Exchange the code for an access token
  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    return sendError(res, 502, 'Token exchange request failed', escapeHtml(err.message));
  }
  if (!tokenData || tokenData.error || !tokenData.access_token) {
    return sendError(res, 400, 'Token exchange failed',
      escapeHtml(tokenData?.error_description || tokenData?.error || 'GitHub did not return an access token.'));
  }

  // Fetch the user profile
  let user;
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': 'Bearer ' + tokenData.access_token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'EditorX'
      }
    });
    user = await userRes.json();
  } catch (err) {
    return sendError(res, 502, 'Failed to fetch GitHub user', escapeHtml(err.message));
  }
  if (!user || !user.login) {
    return sendError(res, 400, 'No user profile returned',
      'GitHub responded but didn\'t include a usable user profile. Check the OAuth App scopes.');
  }

  // If the user has no public email, try the /user/emails endpoint
  let email = user.email;
  if (!email) {
    try {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': 'Bearer ' + tokenData.access_token,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'EditorX'
        }
      });
      const emails = await emailsRes.json();
      if (Array.isArray(emails)) {
        const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) || emails[0];
        if (primary) email = primary.email;
      }
    } catch { /* fine to skip */ }
  }

  if(!getSessionSecret()){
    return sendError(res, 500, 'Session secret not configured',
      'Set <code>SESSION_SECRET</code> (any long random string) in Vercel env vars and redeploy. ' +
      'It signs the session cookie so the server can trust it without a DB lookup.');
  }

  const token = mintSession({
    provider: 'github',
    login:    user.login,
    name:     user.name || user.login,
    email:    email || null,
    avatar:   user.avatar_url || null
  });

  // Two cookies: real session + clear the OAuth state cookie
  res.setHeader('Set-Cookie', [
    `editorx_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*60*24*30}`,
    'gh_oauth_state=; Path=/; Max-Age=0'
  ]);
  res.statusCode = 302;
  res.setHeader('Location', '/?signed_in=1');
  res.end();
}

function parseCookies(header) {
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function sendError(res, status, title, body){
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)} · EditorX</title>
  <style>
    body{margin:0;background:#0A0A0F;color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{max-width:520px;background:#1D1D23;border:0.5px solid #424245;border-radius:12px;padding:32px}
    h1{font-size:22px;font-weight:600;letter-spacing:-.3px;margin-bottom:12px}
    p{font-size:14px;line-height:1.55;color:#A1A1A6}
    code{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:12px;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:4px;color:#F5F5F7}
    a{display:inline-block;margin-top:20px;color:#0084FF;text-decoration:none;font-weight:500;font-size:13px}
    a:hover{text-decoration:underline}
  </style>
  <div class="card"><h1>${escapeHtml(title)}</h1><p>${body}</p>
  <a href="/">← Back to EditorX</a></div>`);
}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
