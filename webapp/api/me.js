// GET /api/me  →  always 200. Returns {signedIn:false} for guests so the
// boot probe doesn't spam the browser DevTools console with a 401.
import { readSession } from './_lib/session.js';

export default function handler(req, res) {
  const s = readSession(req);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (!s) {
    res.end(JSON.stringify({signedIn: false}));
    return;
  }
  res.end(JSON.stringify({
    signedIn: true,
    login:    s.login,
    name:     s.name,
    email:    s.email,
    avatar:   s.avatar,
    provider: s.provider,
    iat:      s.iat,
    exp:      s.exp
  }));
}
