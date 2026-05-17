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
  if(!KV_URL || !KV_TOKEN){
    return err(res, 503, 'kv_not_configured',
      'Vercel KV is not enabled. The Dashboard will fall back to local storage. ' +
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
      if(!project || !project.id) return err(res, 400, 'bad_request', 'project.id is required.');
      project.updatedAt = new Date().toISOString();
      if(!project.createdAt) project.createdAt = project.updatedAt;
      await kv(['HSET', key, project.id, JSON.stringify(project)]);
      // Lite metadata only in the response
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
    req.on('data', c => { chunks += c; if(chunks.length > 8*1024*1024){ reject(new Error('body too large')); }});
    req.on('end', () => { try{ resolve(chunks ? JSON.parse(chunks) : null); }catch(e){ reject(e); } });
    req.on('error', reject);
  });
}
