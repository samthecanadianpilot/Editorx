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

## Notes

- Frontend-only. No server, no real authentication. The starter "sign-up" screen stores credentials in `localStorage` for demo flow.
- Imported media uses `blob:` URLs that don't survive a page reload — the project structure is restored, but you'll be prompted to re-link external clips.
- `MediaRecorder` MIME support varies by browser. The Export dialog detects what your browser actually supports and only offers those formats.
