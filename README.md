# EditorX

A browser-based, professional video editor — runs entirely in the browser with no build step. Drag in video, scrub the timeline, mask, color-grade, type, and export.

## Features

- **Real video playback** — imported `<video>` elements draw frame-by-frame to a canvas viewer with proper aspect-fit, transform, opacity, and per-clip effect filters.
- **Multi-track timeline** — V1 / A1 / T1 with draggable, trim-able clips, snap-to-edges, blade tool splitting, ripple-free collision protection.
- **Library → Timeline drag-and-drop** — drop media (or OS files from Finder) directly onto a track at the cursor position.
- **Color & effects** — 17 LUTs (composited via canvas blend modes) and 13 standalone effects (CSS-filter-based on canvas).
- **Titles + ~250 Google Fonts** — pick any family in the inspector; fonts lazy-load on demand.
- **Masks** — 7 types with draggable bounding box, corner-handle resize, opacity / feather / animation keyframes.
- **Text dragging** — reposition text clips by dragging their bounding box in the viewer.
- **Project save/load** — autosave to `localStorage`, "continue your last session" on boot, plus `.editorx.json` import/export.
- **Export** — WebM via `MediaRecorder` + `canvas.captureStream`; MP4/H.264 where the browser supports it; project document as `.json`.
- **Undo / redo** — snapshot history with `⌘Z` / `⌘⇧Z`.

## Run it

No build, no dependencies. Just open `index.html`:

```
open index.html
```

Or serve the directory with any static server (recommended for `MediaRecorder` features that need a secure origin):

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell, top bar, sidebars, viewer, timeline, modals |
| `style.css`  | Design tokens + full UI styling (FCPX-inspired charcoal + matte-gray accent) |
| `data.js`    | Static catalogs: masks, effects, LUTs, transitions, titles, font list |
| `engine.js`  | State, mutations, video/audio element pool, playback controller, autosave, undo/redo |
| `ui.js`      | Rendering — clips, panels, viewer canvas (with LUT + effect compositing), inspector |
| `modals.js`  | Wiring — drag/trim/blade/drop, mask props modal, export modal, starter screen, keyboard |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Play / pause |
| J / K / L | Step −1s / pause / step +1s |
| ← / → | Step ±100 ms (Shift = ±1 s) |
| V / B / T / H | Select / Blade / Text / Hand tool |
| N | Toggle snap |
| ⌫ / Delete | Delete selected mask, else selected clip |
| ⌘Z / ⌘⇧Z | Undo / redo |
| ⌘D | Duplicate selected clip |
| ⌘E | Open Export |

## Deploy to Vercel + real GitHub sign-in

EditorX ships with a real GitHub OAuth flow handled by two serverless functions at `/api/auth/github/start` and `/api/auth/github/callback`. Once deployed and configured, **Continue with GitHub** does a proper OAuth round-trip (no fake/demo auth).

### 1. Push the repo to GitHub
Already pushed — origin is `git@github.com:samthecanadianpilot/Editorx.git`. After every edit, just `git push`.

### 2. Connect to Vercel
1. Go to https://vercel.com/new
2. Import `samthecanadianpilot/Editorx`
3. Framework preset: **Other** (it auto-detects — pure static + `/api` serverless)
4. Build command: **(none)** · Output directory: **(root)**
5. Hit **Deploy**. You'll get a URL like `https://editorx-xxx.vercel.app`.

### 3. Create a GitHub OAuth App
1. Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. **Application name:** `EditorX` (or anything)
3. **Homepage URL:** `https://<your-vercel-domain>`
4. **Authorization callback URL:** `https://<your-vercel-domain>/api/auth/github/callback` ← exact path matters
5. Hit **Register application**.
6. On the next page: **copy the Client ID**, click **Generate a new client secret**, **copy the secret** (you'll only see it once).

### 4. Add env vars in Vercel
In Vercel → your project → **Settings** → **Environment Variables**, add:

| Name              | Value                                    |
|-------------------|------------------------------------------|
| `GH_CLIENT_ID`    | Client ID from GitHub OAuth App          |
| `GH_CLIENT_SECRET`| Client Secret from GitHub OAuth App      |
| `SESSION_SECRET`  | Any long random string (32+ chars)       |

Apply to **Production / Preview / Development**. `SESSION_SECRET` signs the HTTP-only session cookie — keep it private and never commit it. If unset, the server falls back to `GH_CLIENT_SECRET` (works but use a dedicated value in real deployments).

Then trigger a redeploy (Deployments → ⋯ → Redeploy) so the functions pick up the new env.

### 5. Test
Visit your Vercel URL → **Continue with GitHub** → authorize → you land back in the editor as your real GitHub user (name, avatar, login).

If something is misconfigured, the OAuth function returns a styled error page telling you exactly what's wrong (missing env var, mismatched callback URL, expired state, etc.) instead of a generic crash.

## Backend API

EditorX ships with a small Node serverless API on Vercel.

| Route                            | Method | Auth | Purpose                                                            |
|----------------------------------|--------|------|--------------------------------------------------------------------|
| `/api/auth/github/start`         | GET    | —    | Begin OAuth — CSRF state cookie + 302 to GitHub authorize.         |
| `/api/auth/github/callback`      | GET    | —    | Exchange code → token, fetch user, mint signed session cookie.     |
| `/api/auth/signout`              | POST   | —    | Clear the session cookie. 302 to `/` (or JSON if `Accept: json`).  |
| `/api/me`                        | GET    | ✓    | Return the current user (from the signed cookie).                  |
| `/api/projects`                  | GET    | ✓    | List the signed-in user's projects (metadata only, sorted recent). |
| `/api/projects?id=<id>`          | GET    | ✓    | Fetch one full project including its document.                     |
| `/api/projects`                  | POST   | ✓    | Upsert a project (body = full project JSON).                       |
| `/api/projects?id=<id>`          | DELETE | ✓    | Delete a project.                                                  |

Sessions are signed JWT-style payloads (HMAC-SHA256) in an HTTP-only `Secure` cookie — no server-side session table needed. Tokens expire after 30 days.

### Optional: cloud project storage (Vercel KV)

The Dashboard works offline-first against `localStorage`. To sync projects across devices, enable **Vercel KV**:

1. In your Vercel project → **Storage** tab → **Create Database** → **KV** (free tier is fine).
2. Connect it to the project. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Redeploy. `/api/projects` will start using KV automatically.

Without KV, `/api/projects` returns `503 kv_not_configured` and the frontend keeps using localStorage — nothing breaks.

## Notes

- Imported media uses `blob:` URLs that don't survive a page reload — the project structure is restored, but you'll be prompted to re-link external clips.
- `MediaRecorder` MIME support varies by browser. The Export dialog detects what your browser actually supports and only offers those formats.
- Guest mode still works (the "Continue as guest" link on the starter) — useful for trying EditorX without signing in. Guest data is local-only.
