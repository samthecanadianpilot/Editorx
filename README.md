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

**Recommended: set Vercel project Root Directory = `webapp`.** Then Vercel reads `webapp/vercel.json` and serves the app from the subdirectory. `/api/*` routes work via Vercel's auto-detection.

If Root Directory stays `.` (default), the root `vercel.json` rewrites `/(.*)` → `/webapp/$1` and explicitly registers `webapp/api/**/*.js` as functions. Same result, slightly slower routing.

## Local dev

No build step. From `webapp/`:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

`/api/*` routes only run in deployed Vercel environments (locally they 404, and `cloud.js` falls back to guest mode gracefully).

## Design system

See [`webapp/design-system/MASTER.md`](webapp/design-system/MASTER.md) — true-black palette, SF Pro / Inter sans-serif, Apple-style `linear-gradient(135deg, #FFB070, #FF6F91, #B65CFF)` text-fill on hero emphasis words.
