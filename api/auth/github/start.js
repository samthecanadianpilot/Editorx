// Vercel serverless function: kicks off GitHub OAuth.
// Set GH_CLIENT_ID and GH_CLIENT_SECRET in your Vercel project's Environment Variables.
// Authorization callback URL on the GitHub OAuth App must be:
//   https://<your-vercel-domain>/api/auth/github/callback

import crypto from 'crypto';

export default function handler(req, res) {
  const clientId = process.env.GH_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderError('GitHub OAuth is not configured',
      'The <code>GH_CLIENT_ID</code> environment variable is not set on this deployment. ' +
      'Open your Vercel project → Settings → Environment Variables and add it (plus <code>GH_CLIENT_SECRET</code>), ' +
      'then redeploy. See the README for the full step-by-step.'));
    return;
  }

  // CSRF state nonce, stored as an HttpOnly cookie and round-tripped through GitHub.
  const state = crypto.randomBytes(16).toString('hex');

  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host = req.headers.host;
  const redirectUri = `${proto}://${host}/api/auth/github/callback`;

  res.setHeader('Set-Cookie',
    `gh_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state
  });

  res.statusCode = 302;
  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params.toString()}`);
  res.end();
}

// Shared inline HTML error renderer (kept in sync visually with the Apple-design starter)
function renderError(title, body){
  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)} · EditorX</title>
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
  <a href="/">← Back to EditorX</a></div>`;
}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
