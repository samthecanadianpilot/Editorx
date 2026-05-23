# EditorX Design System — MASTER

Single source of truth for visual + interaction decisions. Page-specific overrides live in `design-system/pages/*.md`.

---

## Direction

**Style:** *Editorial cinema, flat.* Warm-charcoal dark surfaces, cream-warm type, Apple-blue accent. No gradients on chrome, no glow, no grain, no shine. Surfaces are flat; depth comes from spacing and a single elevation tier (1px hairline). Functional gradients (audio waveforms, timeline grid, transition previews) stay — they carry information.

**Why this direction:** EditorX is a long-session pro tool. Users scrub, mask, and color for hours. Decoration competes with the timeline and viewer. Flat surfaces + warm-shifted neutrals reduce visual noise and eye fatigue while staying distinctive (warm > pure-cold grey).

---

## Tokens

### Surface — TRUE BLACK
| Token | Value | Use |
|---|---|---|
| `--bg-1` | `#000000` | App body, viewer canvas backdrop |
| `--bg-2` | `#0A0A0A` | Topbar, timeline wrapper, deep panels |
| `--surface-1` | `#141414` | Sidebars, inspector, modal body |
| `--surface-2` | `#1E1E1E` | Cards, clip body, raised controls |
| `--surface-3` | `#2A2A2A` | Hover surface, active state |

### Text — warm-white on black
| Token | Value | Use | Contrast vs `--bg-1` |
|---|---|---|---|
| `--text-1` | `#F5F4F0` | Primary content, headings, clip names | **19.4:1 AAA** |
| `--text-2` | `#A0A0A0` | Secondary labels, helper text | **7.0:1 AAA** |
| `--text-3` | `#6B6B6B` | Tertiary (timestamps, axis ticks) | 3.1:1 large text only |
| `--text-4` | `#404040` | Disabled / decorative | n/a |

Direction note: black + cream-warm (vs pure white) keeps the editorial signature of EditorX while gaining OLED-style depth. Pure white on pure black reads brutalist/cold-tech; the slight cream warmth keeps it human.

### Accent + Semantic
| Token | Value | Use |
|---|---|---|
| `--accent` | `#0A84FF` | Primary buttons, selection, playhead, focus ring |
| `--accent-h` | `#1B95FF` | Hover |
| `--accent-a` | `#0070E0` | Pressed / active |
| `--accent-soft` | `rgba(10,132,255,0.16)` | Selected row background, badge bg |
| `--good` | `#30D158` | Success, "All changes saved", audio waveform |
| `--warn` | `#FFB340` | Warning, callout titles |
| `--danger` | `#FF453A` | Destructive action, error message |
| `--danger-soft` | `rgba(255,69,58,0.16)` | Error field bg |

**Killed:** `--accent-glow` — was declared but never used. Removed.

### Lines
| Token | Value | Use |
|---|---|---|
| `--sep` | `#3A3640` | Section dividers (track lanes, panel headers) |
| `--border` | `#2E2A36` | Form controls, clip border |
| `--hairline` | `rgba(242,239,232,0.06)` | Subtle internal divider |

### Typography
- **`--font` / `--font-d`** : Fraunces (variable serif, axes 9..144, 300..900). Editorial signature — headings, marketing copy, clip names, modal titles.
- **`--mono`** : JetBrains Mono. Timecode, shortcut chips, numeric scales (must be tabular).
- **UI body**: Fraunces at 13px, 1.55 line-height, `-.005em` tracking. Optical sizing on.
- **Heading sizes**: 32 / 24 / 18 / 16 / 13 (page hero / section / panel-title / button / body).
- **Numbers in tables/timecode**: enable `font-variant-numeric: tabular-nums` to prevent column jitter.

### Spacing — 4px grid
`--s-1 4 · --s-2 8 · --s-3 12 · --s-4 16 · --s-5 24 · --s-6 32`. Section spacing tiers: 16 / 24 / 32.

### Radii
`--r-1 4 · --r-2 6 · --r-3 8 · --r-4 12 · --r-full 9999`. Buttons: r-2. Cards/panels: r-3. Modals: r-4. Pills/badges: r-full.

### Motion
- `--t-fast`  `.12s cubic-bezier(.4,0,.2,1)` — color/bg state changes
- `--t-base`  `.15s` — micro-interactions (default)
- `--t-slow`  `.22s` — panel expand/collapse
- `--t-press` `.08s ease-out` — `:active` scale(.96) press feedback
- `--t-spring` `.35s cubic-bezier(.34,1.56,.64,1)` — card entry only

Always respect `prefers-reduced-motion: reduce` — already global.

---

## Anti-patterns (banned in this codebase)

1. **No gradients on chrome.** Sidebars, headers, modals, buttons, panels = single flat surface. The only allowed gradients are:
   - `.wave-bar` (audio amplitude visualization)
   - `#timeline-tracks` background grid (1px ruler lines)
   - `.tr-preview` (transition previews — direction is the *content*)
2. **No glow.** No `box-shadow: 0 0 N rgba(accent…)`. Selection uses a 1px solid border + `--accent-soft` background.
3. **No film grain.** Removed `#grain` overlay — contradicts the flat brief.
4. **No emoji as UI icons.** Lucide SVG only. Brand icons (YouTube/Discord/etc.) where Lucide dropped them fall back to neutral semantic icons (see `data.js` GRAPHICS).
5. **No hover lifts** (`transform: translateY(-2px)` etc.). Use background change + border color.
6. **No tooltip-only labels.** Icon-only buttons must have `aria-label`, not just `title=`.

---

## Interaction baseline

- **Focus:** `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` on every interactive element. Keyboard-only — pointer focus stays clean.
- **Hover:** background shift to `--surface-3` or `--accent-soft`. Never a transform.
- **Pressed:** `transform: scale(.96)` for ~80ms (`--t-press`). Already global on `button:active`.
- **Disabled:** `opacity: .4` + `pointer-events: none` + `aria-disabled="true"`.
- **Touch targets:** ≥36×36 (desktop pro tool — denser than mobile 44×44, but never below 36). Transport buttons are 32×32 by design (DaVinci density) — accepted.
- **Tabular numbers:** all timecodes, durations, axis ticks use `font-variant-numeric: tabular-nums`.

---

## Components — quick rules

- **Buttons:** solid `var(--accent)` for primary, transparent + 1px `--border` for ghost. Hover = `--accent-h`. Active = `--accent-a`. No gradient.
- **Inputs:** `var(--surface-1)` bg, 1px `--border`, r-2. Focus → `--accent` border + `--accent-soft` 0 0 0 3px ring.
- **Panels:** `var(--surface-1)` bg, no shadow, header has `--hairline` bottom border.
- **Cards (transition / LUT / effect):** `var(--surface-2)` bg, r-3, 1px `--border`. Hover → `--surface-3`. Selected → `--accent` border.
- **Modals:** `var(--surface-1)` bg, r-4, no gradient, 1px `--border`. Scrim: `rgba(0,0,0,0.55)`.
- **Clips on timeline:** `var(--surface-2)` bg with 1px `--border`. Selected → 2px `--accent` border (NOT box-shadow glow).

---

## Stack note

EditorX is **vanilla HTML/CSS/JS, no build step**. All tokens live in `:root` in `style.css`. There is no Tailwind, no design-token JSON, no CSS-in-JS. To change a token, edit `style.css` and reload.

Tests run via `python3 -m http.server` from the webapp dir. Headless smoke test at `~/tmp/editorx-test/test.mjs` drives Chrome 148 via Playwright.
