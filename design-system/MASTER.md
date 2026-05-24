# EditorX Design System — MASTER

Single source of truth for visual + interaction decisions. Page-specific overrides live in `design-system/pages/*.md`.

---

## Direction

**Style:** *Apple-level monochrome — true black + cream-warm light.* Linear/Arc/Nothing aesthetic. No chromatic accent. Hierarchy comes from contrast (cream-on-black for primary CTAs) and light (subtle ambient gradients on marketing surfaces). Soft shadows, large radii, frosted glass on modals + topbar, refined typography.

**Two surface tiers:**
1. **Marketing tier** — starter screen, dashboard, modals. Gets the Apple-level treatment: ambient radial gradients in the background, glassmorphism, massive hero typography (`clamp(40px, 5.6vw, 76px)`), backdrop-blur, soft shadows.
2. **Editor tier** — the actual editing surface. Stays dense and functional (Apple's own pro tools — Final Cut Pro, Logic Pro — are also dense, not airy). Translucent topbar is the one Apple-level touch; everything else is flat 32px toolbars and tight panels so users can scrub for 8 hours.

**Why this direction:** Apple's marketing pages and Apple's pro tools live in different visual languages. EditorX adopts both — premium minimalism on the way in, focused density once you're working.

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

### Accent — monochrome (cream-warm "lit")
The blue is gone. The accent is now the same warm-white as primary text — primary CTAs are cream-on-black (high-contrast inversion). Hierarchy comes from contrast and treatment, not color.

| Token | Value | Use |
|---|---|---|
| `--accent` | `#F5F4F0` | Primary CTA bg, selection ring, focus ring, playhead, italic hero accent |
| `--accent-h` | `#FFFFFF` | Hover (slightly brighter/cooler) |
| `--accent-a` | `#E0DFD9` | Pressed / active |
| `--accent-soft` | `rgba(245,244,240,0.08)` | Selected row, badge bg, subtle highlight |
| `--accent-ink` | `#0A0A0A` | Text color when placed on top of solid `--accent` button |

### Semantic
| Token | Value | Use |
|---|---|---|
| `--good` | `#30D158` | Success, "All changes saved", audio waveform |
| `--warn` | `#FFB340` | Warning, callout titles |
| `--danger` | `#FF453A` | Destructive action, error message |
| `--danger-soft` | `rgba(255,69,58,0.16)` | Error field bg |

### Glass + Elevation (Apple-level)
| Token | Value | Use |
|---|---|---|
| `--glass-1` | `rgba(20,20,20,0.55)` | Topbar (sticky chrome over content) |
| `--glass-2` | `rgba(20,20,20,0.72)` | Modal body |
| `--glass-blur` | `blur(28px) saturate(180%)` | The `backdrop-filter` applied to glass surfaces |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.4) + hairline` | Buttons, small lifts |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.45) + hairline` | Card hover |
| `--shadow-lg` | `0 24px 64px rgba(0,0,0,.6) + hairline` | Dropdowns, command palette |
| `--shadow-xl` | `0 40px 96px rgba(0,0,0,.7) + hairline` | Modals |
| `--amb-radial` | Subtle 2-stop radial cream | Background atmosphere on starter/dashboard only |

**Anti-patterns enforced:**
- `--accent-glow` token was unused → deleted
- `var(--select)` token was undeclared but referenced → fixed to `var(--accent)`
- Film grain overlay → removed (HTML + CSS + override)
- White text (`#fff`) on cream `var(--accent)` background → systematically swapped to `var(--accent-ink)` for legibility (cmdk active row, onboarding Next button, list-card selected icon, context-menu hover, primary CTAs)

### Lines
| Token | Value | Use |
|---|---|---|
| `--sep` | `#3A3640` | Section dividers (track lanes, panel headers) |
| `--border` | `#2E2A36` | Form controls, clip border |
| `--hairline` | `rgba(242,239,232,0.06)` | Subtle internal divider |

### Typography — Apple-native sans
Apple's marketing pages (apple.com, apple.com/final-cut-pro) and pro tools (FCP, Logic) all use **SF Pro Display** via `-apple-system`. They never use a serif in the UI. EditorX matches.

- **`--font` / `--font-d`** : `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif`. SF Pro on Apple devices, Inter (Google Font) on everything else — near-identical metrics.
- **`--font-serif`** : Fraunces (variable serif). Reserved for opt-in editorial moments via the `.ff-serif` utility class. Not the default.
- **`--mono`** : JetBrains Mono. Timecode, shortcut chips, numeric scales — must use `font-variant-numeric: tabular-nums`.
- **UI body**: 13px / 1.55 / -.005em tracking. Sans is denser than serif at the same size, so 13px reads comfortably.
- **Hero scale** (matches FCP page):
  - Starter headline: `clamp(44px, 6vw, 88px)` · weight 700 · tracking -0.045em · line 0.96
  - Dashboard hero: `clamp(40px, 4.4vw, 64px)` · weight 700 · tracking -0.04em · line 0.98
  - Starter title (sign-in card): `clamp(40px, 4vw, 56px)` · weight 700 · tracking -0.04em
- **Emphasis word treatment (the FCP "Intelligence" move):** instead of italic, the `<em>` word in hero gets a gradient text-fill `linear-gradient(135deg, #FFB070 0%, #FF6F91 50%, #B65CFF 100%)` — Apple's signature warm-orange→pink→purple. This is the *only* place chromatic color appears in the marketing surfaces.
- **Numbers in tables/timecode**: `font-variant-numeric: tabular-nums`.

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
