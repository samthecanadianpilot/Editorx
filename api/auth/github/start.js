// Vercel serverless function: kicks off GitHub OAuth.
// Set GH_CLIENT_ID and GH_CLIENT_SECRET in your Vercel project's Environment Variables.
// Authorization callback URL on the GitHub OAuth App must be:
//   https://<your-vercel-domain>/api/auth/github/callback

import crypto from 'crypto';

export default function handler(req, res) {
  const clientId = process.env.GH_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Server is missing GH_CLIENT_ID. Configure it in Vercel → Settings → Environment Variables.');
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
