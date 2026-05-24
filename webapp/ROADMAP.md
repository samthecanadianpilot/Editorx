# EditorX — Project Roadmap

_Last updated: 2026-05-16_
_Repo: https://github.com/samthecanadianpilot/Editorx_
_Live: https://editorx-beta.vercel.app_

---

## Vision

A precise, tactile, browser-based video editor that feels professional without
requiring a download or a beefy workstation. **Real video pipeline. Real auth.
Real cloud storage. No fake demos.**

---

## Today — What's shipped

### Editor core
- Multi-track timeline (V1 / A1 / T1) with drag, trim, snap, collision
  protection, blade-tool splitting, ripple-free.
- Library → Timeline drag-and-drop (and OS file drop).
- Library thumbnails: first-frame for video, the image itself for images,
  icon for audio.
- Real video playback to a canvas viewer with proper aspect-fit, transform,
  per-clip CSS-filter effect, and LUT compositing.
- Playback v2: playhead is now driven by the active video's `currentTime`
  (video is the source of truth) — no more re-seek stutter.
- 17 LUTs (canvas blend-mode composited) with live-graded preview swatches
  on each card.
- 10 transitions with animated CSS preview thumbnails per transition.
- 13 standalone effects.
- 7 mask types (Rectangle, Ellipse, Bezier, Gradient, Feathered, Animated,
  Inverted) with drag, corner-handle resize, animated keyframes.
- Text clips with ~250 Google Fonts (lazy-loaded), color picker, scale,
  position, opacity, rotation.
- Text dragging in the viewer with **smart guides** (snaps to center,
  thirds, edges + red alignment lines).
- Speech-to-text dictation directly into the title text field.
- Text-to-speech preview button (Web Speech API).
- Right-click context menu on clips: Detach Audio / Duplicate / Delete.
- Undo / redo, autosave (debounced 600 ms).
- Export: WebM (always), MP4/H.264 where the browser supports it, `.editorx.json`
  project file. Dynamic format detection via `MediaRecorder.isTypeSupported`.

### Dashboard + projects
- Sign-in screen with real **GitHub OAuth** (no demo auth).
- Projects Dashboard with thumbnails, "edited X ago" stamps, per-card menu
  (Open / Rename / Delete).
- "New Project" modal with size presets (YouTube 1080p / 4K, TikTok,
  Reel, IG Square, IG 4:5, LinkedIn, X, Custom).
- Dynamic viewer canvas dimensions per project — 9:16, 1:1, 4:5 actually
  render at their real dimensions.
- "EditorX" wordmark in the editor topbar = Back to Dashboard.

### Backend
- `api/auth/github/start.js` → CSRF state cookie + 302 to GitHub authorize.
- `api/auth/github/callback.js` → code-for-token exchange, user fetch,
  mints a signed HTTP-only `Secure` `SameSite=Lax` session cookie.
- `api/auth/signout.js` → clears the cookie.
- `api/me.js` → returns the current user (verifies the cookie's HMAC).
- `api/projects.js` → list / get / upsert / delete, backed by Vercel KV.
  Returns clear `503 kv_not_configured` if KV isn't enabled; frontend
  falls back to localStorage automatically.
- `api/_lib/session.js` — JWT-style HMAC-SHA256 signed cookies, 30-day expiry.
- Local-first cloud sync (`cloud.js`): every local save schedules a 1.5 s
  debounced cloud push when signed in. Dashboard hydrates the cloud list
  on load and merges with local.

### Visual / design
- **Fraunces** editorial serif site-wide (variable font, italic + roman).
- Tokens per Apple Design spec: `#0084FF` accent, neutral charcoal scale,
  4 px spacing grid, radii 4/6/8/12, 0.15 s `cubic-bezier(0.4,0,0.2,1)`.
- Selection brackets (Apple-blue corner markers) on the selected video clip
  in the viewer.
- Scissor cursor when the Blade tool is active.
- Vertical yellow cut-line indicator that follows the mouse on the timeline
  while Blade is active.
- `prefers-reduced-motion` respected.

---

## Short-term (next 2–3 turns)

### A. Project file durability
- [ ] **Media re-link flow**: when a project loads with a `sourceUrl` that's
  been invalidated (page reload kills `blob:` URLs), surface a "Re-link
  media" UI in the timeline so users can re-import the missing source.
- [ ] **Project import** (drop a `.editorx.json` onto the Dashboard).

### B. Audio workflow
- [ ] **Volume rubber band**: drag a horizontal line on the audio waveform
  on the timeline to set per-clip volume (FCPX-style).
- [ ] **Audio-only export** as `.wav` / `.mp3`.
- [ ] **Voiceover-as-clip**: use TTS to generate a `Blob` via
  `MediaRecorder` + `WebAudio` and drop it onto A1 as a real audio clip.

### C. Title polish
- [ ] **Text animations** on text clips: typewriter, fade-up, scale-bounce,
  word-by-word reveal, glitch.
- [ ] **Lower-third compositions** (text + background bar + animated entry).

### D. Backend extension
- [ ] **Cloud media upload** via Vercel Blob (one-click "Save to cloud"
  on a media item, replaces the `blob:` URL with a persistent one).
- [ ] **Project sharing**: read-only shareable link
  (`/p/<short-id>` → public viewer).

---

## Mid-term (this month)

### Video pipeline
- [ ] **WebCodecs encode path** for high-quality H.264 export, replacing
  the canvas-capture WebM path on Chromium browsers.
- [ ] **Real clipping mask compositing** (currently masks render as DOM
  outlines — wire them through to the canvas via `ctx.clip()`).
- [ ] **Per-clip in/out trim** that actually trims source playback
  (currently width only).

### Editor UX
- [ ] **Magnetic snap line during clip drag** (visual, like FCPX).
- [ ] **Keyboard nudge** for selected clips (← / → moves by 1 frame,
  Shift = 10 frames).
- [ ] **Workspace memory**: remember the last panel + zoom per project.
- [ ] **Ripple / roll / slip / slide edits** on the clip context menu.

### Backend
- [ ] **Postgres user table** (Vercel Postgres) for richer profile data,
  email-based account recovery, settings sync.
- [ ] **API rate limits** + audit log for project mutations.

---

## Long-term (next quarter)

### Collaboration
- [ ] **Real-time multi-user editing** (Yjs + WebSocket relay on Vercel).
- [ ] **Comments** anchored to specific clips or timecodes.
- [ ] **Version history** with named snapshots and rollback.

### AI features
- [ ] **Auto-subtitle generation** from any video clip's audio (using a
  hosted Whisper endpoint).
- [ ] **One-click "make it square / vertical / wide"** with smart re-frame
  (face / motion tracking).
- [ ] **Background-music search** with mood / tempo filters.

### Distribution
- [ ] **Desktop wrapper** (Tauri) for offline-first editing with the same UI.
- [ ] **Marketplace**: shareable LUTs, transitions, title templates.

---

## Explicitly out of scope
- Non-linear effects compositor (After Effects-style node graph).
- 3D camera / 3D layers.
- DAW-grade audio mixing (volume + pan + speed is the bar).
- Hardware-decode optimization for old browsers.

---

## Architecture decisions

- **No build step.** Plain HTML + ES modules in the browser, plain ESM in
  Vercel Node functions. Easy to read, easy to deploy, easy to fork.
- **Local-first.** Everything works offline against `localStorage`. Cloud
  sync is an enhancement that mirrors what's already saved, not a hard
  dependency.
- **Vercel-native.** No separate backend service — `/api/*` runs as
  serverless functions; sessions are signed cookies (no session table);
  storage is Vercel KV (Upstash REST under the hood); media will be
  Vercel Blob.
- **Honest auth.** Sessions are HMAC-SHA256-signed JWT-style payloads in
  HttpOnly+Secure+SameSite=Lax cookies. Never trust a value the client
  could have tampered with.

---

## Decisions still open
1. **Pricing / quota**: is this free forever, or a free tier + paid?
   That affects whether we need Stripe + a real user table.
2. **TTS provider**: stay browser-native (free, limited voices) or add a
   server-side path (ElevenLabs / OpenAI) for higher-quality voices?
3. **STT for transcripts**: browser-native works only in Chrome reliably.
   Server-side Whisper is more universal but costs money per minute.
4. **Mobile editing**: full mobile UI, or just a "preview-only" mode on
   small screens?

---

## How to contribute
1. `git clone git@github.com:samthecanadianpilot/Editorx.git`
2. Open `index.html` in a browser (or `python3 -m http.server 8000`).
3. Make changes, `git push` — Vercel auto-deploys.
4. To work on `/api/*` locally: `vercel dev` (requires `vercel` CLI).
