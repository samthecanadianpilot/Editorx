// GET /api/me  →  current session payload, or 401 if not signed in.
import { readSession } from './_lib/session.js';

export default function handler(req, res) {
  const s = readSession(req);
  if (!s) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: 'not_signed_in'}));
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    login:    s.login,
    name:     s.name,
    email:    s.email,
    avatar:   s.avatar,
    provider: s.provider,
    iat:      s.iat,
    exp:      s.exp
  }));
}
