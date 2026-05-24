// /api/projects  —  per-user project storage backed by Vercel KV.
//
//   GET    /api/projects                  → list this user's projects (metadata only, no `doc`)
//   GET    /api/projects?id=<id>          → single project including `doc`
//   POST   /api/projects                  → upsert (body = project object)
//   DELETE /api/projects?id=<id>          → delete one
//
// All routes require a valid session cookie. The KV key per user is
// `editorx:proj:<login>` and stores a Redis HSET keyed by project id.
//
// Required env vars (set automatically by `vercel link` + `vercel env pull` after
// enabling Vercel KV on the project):
//   KV_REST_API_URL
//   KV_REST_API_TOKEN
// Falls back gracefully with a clear error if KV isn't configured yet — the
// frontend will keep using localStorage in that case.

import { readSession } from './_lib/session.js';

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Per-user sliding-window rate limit. In-memory means it resets when the
// function cold-starts — that's fine for serverless and stops accidental
// runaway autosave loops without needing a separate KV table.
const RATE_LIMIT  = 60;   // requests
const RATE_WINDOW = 60_000; // ms
const _rate = new Map();
function checkRate(key){
  const now = Date.now();
  const arr = (_rate.get(key) || []).filter(t => now - t < RATE_WINDOW);
  arr.push(now);
  _rate.set(key, arr);
  return arr.length <= RATE_LIMIT;
}

// Reject obvious garbage early — clip count, name length, payload size.
const MAX_BYTES   = 5 * 1024 * 1024;   // 5 MB / project
const MAX_NAME    = 200;
const MAX_CLIPS   = 5000;
function validateProject(p){
  if(!p || typeof p !== 'object')          return 'project must be an object';
  if(typeof p.id !== 'string' || !p.id)    return 'project.id required';
  if(p.id.length > 64)                     return 'project.id too long';
  if(typeof p.name !== 'string')           return 'project.name must be a string';
  if(p.name.length > MAX_NAME)             return 'project.name too long';
  if(p.doc && typeof p.doc !== 'object')   return 'project.doc must be an object';
  if(p.doc && Array.isArray(p.doc.clips) && p.doc.clips.length > MAX_CLIPS) return 'too many clips';
  return null;
}

async function kv(cmd){
  // Upstash/Vercel KV REST: POST a Redis command as JSON array.
  if(!KV_URL || !KV_TOKEN) throw new Error('KV not configured');
  const r = await fetch(KV_URL, {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${KV_TOKEN}`, 'Content-Type':'application/json' },
    body: JSON.stringify(cmd)
  });
  if(!r.ok) throw new Error('KV ' + r.status);
  const j = await r.json();
  return j.result;
}

function userKey(login){ return `editorx:proj:${login}`; }
function ok(res, body){
  res.statusCode = 200;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(body));
}
function err(res, status, code, message){
  res.statusCode = status;
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({error: code, message}));
}

export default async function handler(req, res){
  const session = readSession(req);
  if(!session || !session.login){
    return err(res, 401, 'not_signed_in', 'Sign in first.');
  }
  // Rate-limit per signed-in user
  if(!checkRate('u:' + session.login)){
    res.setHeader('Retry-After', '60');
    return err(res, 429, 'rate_limited', `Too many requests. Limit is ${RATE_LIMIT}/min.`);
  }
  if(!KV_URL || !KV_TOKEN){
    return err(res, 503, 'kv_not_configured',
      'Vercel KV is not enabled. The Dashboard falls back to local storage. ' +
      'Enable Vercel KV in your project Storage tab to sync projects across devices.');
  }
  const key = userKey(session.login);

  try{
    if(req.method === 'GET'){
      const id = req.query?.id;
      if(id){
        const raw = await kv(['HGET', key, id]);
        if(!raw) return err(res, 404, 'not_found', 'No such project.');
        return ok(res, JSON.parse(raw));
      }
      // List: HVALS returns array of stringified projects. Strip `doc` to keep it light.
      const all = await kv(['HVALS', key]) || [];
      const list = all.map(s=>{ try{ const p=JSON.parse(s); delete p.doc; return p; }catch{return null;} }).filter(Boolean);
      list.sort((a,b)=> new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
      return ok(res, {projects:list});
    }

    if(req.method === 'POST'){
      const project = await readJsonBody(req);
      const bad = validateProject(project);
      if(bad) return err(res, 400, 'bad_request', bad);
      const serialized = JSON.stringify(project);
      if(serialized.length > MAX_BYTES){
        return err(res, 413, 'too_large', `Project exceeds ${MAX_BYTES} bytes.`);
      }
      project.updatedAt = new Date().toISOString();
      if(!project.createdAt) project.createdAt = project.updatedAt;
      await kv(['HSET', key, project.id, JSON.stringify(project)]);
      const meta = { ...project }; delete meta.doc;
      return ok(res, meta);
    }

    if(req.method === 'DELETE'){
      const id = req.query?.id;
      if(!id) return err(res, 400, 'bad_request', 'id query param required');
      await kv(['HDEL', key, id]);
      return ok(res, {ok:true});
    }

    res.statusCode = 405; res.end();
  }catch(e){
    return err(res, 500, 'kv_error', e.message);
  }
}

async function readJsonBody(req){
  if(req.body && typeof req.body === 'object') return req.body; // Vercel auto-parses JSON
  return new Promise((resolve, reject)=>{
    let chunks = '';
    req.on('data', c => { chunks += c; if(chunks.length > MAX_BYTES){ reject(new Error('body too large')); }});
    req.on('end', () => { try{ resolve(chunks ? JSON.parse(chunks) : null); }catch(e){ reject(e); } });
    req.on('error', reject);
  });
}
