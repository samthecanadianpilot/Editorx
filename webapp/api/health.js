// GET /api/health
// Returns the deployment's runtime config status — useful for quickly
// verifying which env vars are wired without exposing any values.
import { getSessionSecret } from './_lib/session.js';

export default function handler(req, res){
  const status = {
    ok: true,
    app: 'EditorX',
    version: 1,
    time: new Date().toISOString(),
    services: {
      session_secret:  !!getSessionSecret(),
      gh_oauth:        !!(process.env.GH_CLIENT_ID && process.env.GH_CLIENT_SECRET),
      vercel_kv:       !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    },
    region: process.env.VERCEL_REGION || 'local'
  };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(status, null, 2));
}
