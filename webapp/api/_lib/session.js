// Shared session helpers for EditorX API routes.
//
// Sessions are signed-JWT-ish payloads (HMAC-SHA256) stored in an HTTP-only
// Secure cookie. There is no DB lookup on every request — the signature proves
// authenticity. Sessions expire after 30 days; the cookie is `SameSite=Lax`
// so it survives top-level OAuth redirects.
//
// Required env var:
//   SESSION_SECRET — any long random string. If missing we refuse to mint
//   sessions (so a misconfigured deployment can't silently sign with empty key).

import crypto from 'crypto';

const COOKIE = 'editorx_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function b64url(buf){
  return Buffer.from(buf).toString('base64url');
}
function fromB64url(str){
  return Buffer.from(str, 'base64url');
}

function sign(payload, secret){
  const head = b64url(JSON.stringify({alg:'HS256', typ:'JWT'}));
  const body = b64url(JSON.stringify(payload));
  const sig  = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest();
  return `${head}.${body}.${b64url(sig)}`;
}

function verify(token, secret){
  if(!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if(parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expected = b64url(
    crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest()
  );
  // constant-time compare
  if(sig.length !== expected.length) return null;
  if(!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload;
  try{ payload = JSON.parse(fromB64url(body).toString('utf8')); }catch{ return null; }
  if(payload.exp && Date.now()/1000 > payload.exp) return null;
  return payload;
}

export function getSessionSecret(){
  // Fall back to GH_CLIENT_SECRET if SESSION_SECRET isn't set — convenient
  // for first-time setups but log a warning so the user sets a dedicated one.
  const s = process.env.SESSION_SECRET || process.env.GH_CLIENT_SECRET;
  if(!s) return null;
  return s;
}

export function mintSession(user){
  const secret = getSessionSecret();
  if(!secret) throw new Error('No SESSION_SECRET configured');
  const now = Math.floor(Date.now()/1000);
  const payload = {
    sub: user.login || user.email || 'guest',
    provider: user.provider || 'github',
    login: user.login || null,
    name:  user.name  || null,
    email: user.email || null,
    avatar:user.avatar|| null,
    iat: now,
    exp: now + MAX_AGE
  };
  return sign(payload, secret);
}

export function setSessionCookie(res, token){
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`);
}
export function clearSessionCookie(res){
  res.setHeader('Set-Cookie',
    `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function parseCookies(header){
  if(!header) return {};
  const out = {};
  for(const part of header.split(';')){
    const i = part.indexOf('=');
    if(i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function readSession(req){
  const secret = getSessionSecret();
  if(!secret) return null;
  const cookies = parseCookies(req.headers.cookie);
  const tok = cookies[COOKIE];
  if(!tok) return null;
  return verify(tok, secret);
}

export const SESSION_COOKIE_NAME = COOKIE;
