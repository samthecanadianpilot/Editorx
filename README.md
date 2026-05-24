# EditorX

Browser-based professional video editor — masks, LUTs, effects, ~250 Google Fonts, real video playback in the canvas.

## Repo layout

```
/                    <- repo root, Vercel-ready
├── vercel.json      <- fallback config if Vercel Root Directory = "."
├── README.md        <- you are here
└── webapp/          <- the actual app (set this as Vercel Root Directory)
    ├── index.html
    ├── style.css
    ├── data.js, engine.js, ui.js, modals.js, cloud.js
    ├── api/         <- Vercel serverless functions (auth + projects)
    ├── design-system/MASTER.md
    └── vercel.json  <- preferred config (used if Root Directory = "webapp")
```

## Deploy on Vercel

Two paths — pick one.

### Path A: Vercel's built-in GitHub integration

**Recommended layout:** set Vercel project Root Directory = `webapp`. Then Vercel reads `webapp/vercel.json` and serves the app from the subdirectory. `/api/*` routes work via Vercel's auto-detection.

If Root Directory stays `.` (default), the root `vercel.json` rewrites `/(.*)` → `/webapp/$1` and explicitly registers `webapp/api/**/*.js` as functions. Same result, slightly slower routing.

### Path B: GitHub Actions (bulletproof — bypasses Vercel webhook)

The workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `vercel deploy --prod` from CI on every push to `main`. Use this if Vercel's GitHub webhook stops firing after force-pushes or other history rewrites.

**One-time setup — add three repo secrets at** `https://github.com/samthecanadianpilot/Editorx/settings/secrets/actions`:

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel dashboard → Account Settings → Tokens → Create Token (full scope) |
| `VERCEL_ORG_ID` | Vercel dashboard → your team/personal account → Settings → "Your ID" (or visible in any project URL) |
| `VERCEL_PROJECT_ID` | Vercel dashboard → editorx-beta project → Settings → General → "Project ID" near the bottom |

After the secrets are set, push any commit (or click "Run workflow" on the deploy.yml run page) to trigger a deploy. The CI run prints the live URL in its summary.

## Local dev

No build step. From `webapp/`:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

`/api/*` routes only run in deployed Vercel environments (locally they 404, and `cloud.js` falls back to guest mode gracefully).

## Design system

See [`webapp/design-system/MASTER.md`](webapp/design-system/MASTER.md) — true-black palette, SF Pro / Inter sans-serif, Apple-style `linear-gradient(135deg, #FFB070, #FF6F91, #B65CFF)` text-fill on hero emphasis words.
