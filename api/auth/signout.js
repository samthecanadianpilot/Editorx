// POST /api/auth/signout  →  clears the session cookie. 302 to /.
import { clearSessionCookie } from '../_lib/session.js';

export default function handler(req, res) {
  clearSessionCookie(res);
  // Support both fetch() (no redirect needed) and form posts (302 to home).
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ok: true}));
    return;
  }
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
}
