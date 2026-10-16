# Verity brand and design tokens

Source of truth for color, type, spacing, motion, icons and voice. Read with `PRODUCT.md` (who and why) and `UI_UX_SPEC.md` (pages and components). Written 2026-10-04.

**Decision D12 (2026-10-16) supersedes the navy and Verity Green palette and the Archivo, JetBrains Mono, Atkinson faces.** The rack palette (amber accent) and the Sofia Sans faces below are now the source of truth. Sections 1.3 to 1.5 and the contrast table record the earlier navy and green system and are kept as history only; the live tokens are in `frontend/src/app/globals.css`.

---

## 1. Color

### 1.1 Strategy

- **Studio, Try, Results (product register): Restrained.** Warm near-black neutrals carry 90% of the surface. Amber is the single signal. Fail, warn and info appear only as state.
- **Landing (brand register): Restrained with an earned signal.** Same palette; the page's color comes from the live replay itself. As the recorded run passes tests, amber appears on screen. Nothing on the landing is amber unless it is verified or the primary action.
- **Rule: amber is earned.** Amber means one of three things only: verified/pass, the one primary action on a screen, or keyboard focus. Never decoration, never a background wash, never gradient text. Running or in-progress states use pale amber (`--rk-run`). Fail is a hollow white square plus the word, never red. Known risk: amber reads as a warning on instruments; mitigated by shape plus word.

Theme: dark only. Scene sentence for both registers: a judge on a 14-inch laptop late in a judging session, arriving from the dark navy Devpost thumbnail, watching an autonomous run for two or three minutes; a dark surface keeps that continuity and lets status color carry the meaning.

### 1.2 Fixed brand colors (D12, do not change)

| Token | Role | Hex |
|---|---|---|
| `--rk-ground` | Page background | `#0A0806` |
| `--rk-panel` / `--rk-panel-2` | Surfaces, raised surfaces | `#13100C` / `#19150F` |
| `--rk-inset` | Code and inset wells | `#0C0A07` |
| `--rk-rule` / `--rk-rule-2` | Hairlines, strong rules | `#2A231A` / `#3A3024` |
| `--rk-ink` / `--rk-ink-2` / `--rk-ink-3` | Text: primary, secondary, tertiary | `#F3EEE6` / `#C4BBAE` / `#978C7E` |
| `--rk-seg-off` / `--rk-seg-off-b` / `--rk-grey` | Unlit segments, their border, disabled | `#1E1912` / `#2C251B` / `#7E7468` |
| `--rk-a` | Amber accent (pass, proven, primary action, focus) | `#FFB000` |
| `--rk-a2` / `--rk-a3` / `--rk-a4` / `--rk-a5` | Accent tiers, brightest to dimmest (earned only) | `#E09A00` / `#A66F00` / `#5C3E00` / `#2E1F05` |
| `--rk-run` / `--rk-run-2` / `--rk-run-bg` | Running / in progress | `#FFD98A` / `#B8995A` / `#211A0C` |
| `--rk-on-a` | Text on accent fills | `#140C00` |

Type faces (loaded in `components/sections/shared/rack-fonts.ts`): display `--font-display` = Sofia Sans Extra Condensed (800, 900); body `--font-body` = Sofia Sans; data and labels `--font-data` = Martian Mono.

The legacy token names (`--background`, `--surface`, `--primary`, `--pass`, `--ring`, `--chart-*`, and `--verity-green`) still exist and now resolve to these values. `--fail` and `--warn` are ivory (white); `--info` is `--rk-run`.

### 1.3 Derived palette (Superseded by D12 (2026-10-16), kept as history)

Neutrals are tinted toward the navy hue (about 255 to 262). Accent tints share Verity Green's hue (151 to 156).

| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--surface-2` | `#131C2B` | `oklch(22.5% 0.032 262)` | Elevated: popovers, inspector header, hovered rows |
| `--surface-3` | `#1D2637` | `oklch(27% 0.034 262)` | Highest: tooltips, selected list rows, shadcn `accent` |
| `--border` | `#232B3A` | `oklch(29% 0.03 262)` | Dividers, node borders at rest (decorative) |
| `--border-strong` | `#5D6A7E` | `oklch(52% 0.035 260)` | Input outlines, edges, hovered node borders (3:1 UI) |
| `--canvas-dot` | `#283040` | `oklch(31% 0.03 262)` | Canvas background dot pattern (decorative) |
| `--foreground` | `#E9EFF7` | `oklch(95% 0.012 255)` | Primary text |
| `--fg-muted` | `#A7B2C2` | `oklch(76% 0.026 257)` | Secondary text, labels |
| `--fg-subtle` | `#8B96A7` | `oklch(67% 0.028 258)` | Tertiary text, placeholders, timestamps |
| `--fg-disabled` | `#5C6470` | `oklch(50% 0.022 258)` | Disabled text only (exempt from contrast) |
| `--primary-hover` | `#8EFEAF` | `oklch(91% 0.15 152)` | Primary button hover |
| `--primary-press` | `#3EE77D` | `oklch(82% 0.2 151)` | Primary button active |
| `--primary-muted` | `#00351C` | `oklch(29% 0.07 156)` | Pass tint behind green text (badges, diff gutter) |
| `--fail` | `#FF6367` | `oklch(70% 0.19 22)` | FAIL status, destructive |
| `--fail-muted` | `#441415` | `oklch(27% 0.075 22)` | Fail tint behind red text |
| `--warn` | `#FEBE4E` | `oklch(84% 0.145 78)` | Credit cap, metric regressions, sample-data badge |
| `--warn-muted` | `#382503` | `oklch(28% 0.055 78)` | Warn tint |
| `--info` | `#6DCAF8` | `oklch(80% 0.11 232)` | RUNNING status, active edge, live connection |
| `--info-muted` | `#042C43` | `oklch(28% 0.06 240)` | Info tint |
| `--chart-3` | `#B699EB` | `oklch(74% 0.12 300)` | Third chart series |
| `--chart-5` | `#818D9F` | `oklch(64% 0.03 258)` | Baseline (v1) series |
| `--syn-keyword` | `#82D9B4` | `oklch(82% 0.1 165)` | Verilog keywords (`module`, `always`, `assign`) |
| `--syn-type` | `#91BEF7` | `oklch(79% 0.095 255)` | Types and directions (`logic`, `wire`, `input`) |
| `--syn-number` | `#F4C677` | `oklch(85% 0.11 80)` | Numeric literals (`32'h0`, `3'd1`) |
| `--syn-comment` | `#8793A5` | `oklch(66% 0.03 258)` | Comments |
| `--syn-string` | `#F3AF91` | `oklch(81% 0.09 45)` | Strings (`$display`) |
| `--diff-add` | `#012A15` | `oklch(25% 0.06 156)` | Added line background |
| `--diff-del` | `#3D1012` | `oklch(25% 0.07 22)` | Removed line background |
| `--selection` | `#084628` | `oklch(35% 0.08 156)` | Text selection |

Syntax keyword green is deliberately desaturated so Verity Green stays the only saturated green on screen.

### 1.4 Contrast results (computed 2026-10-04; Superseded by D12 (2026-10-16), kept as history)

77 pairs checked with the WCAG 2.x relative-luminance formula (OKLCH converted to sRGB in a script). Zero failures. Minimums:

| Foreground | Worst background tested | Ratio | Needs |
|---|---|---|---|
| `--foreground` | surface-3 | 13.1 | 4.5 |
| `--fg-muted` | surface-3 | 7.1 | 4.5 |
| `--fg-subtle` | surface-3 | 5.1 | 4.5 |
| Verity Green text | surface-3 | 11.4 | 4.5 |
| `--fail` text | surface-3 | 5.2 | 4.5 |
| `--warn` text | surface-3 | 9.2 | 4.5 |
| `--info` text | surface-3 | 8.3 | 4.5 |
| Navy text on Verity Green (primary button) | | 15.0 | 4.5 |
| Navy text on `--fail` (destructive button) | | 6.8 | 4.5 |
| Green on `--primary-muted`, fail on `--fail-muted`, warn on `--warn-muted`, info on `--info-muted` | | 10.4 / 5.3 / 8.8 / 7.9 | 4.5 |
| All syntax colors | diff-del, diff-add, bg, surface | 5.0 minimum (comments) | 4.5 |
| `--border-strong` (inputs, edges) | surface | 3.41 | 3.0 |

Pass green and fail red have a luminance ratio of 2.19 to each other, so they separate in grayscale and for red-green color blindness. Status is still never shown by color alone (see 6.2).

### 1.5 Ready-to-paste `globals.css` (Superseded by D12 (2026-10-16), kept as history)

> History only: this block holds the old navy, `#39FF88` and Atkinson values. Do not paste it. The current tokens are in section 1.2 and in `frontend/src/app/globals.css`.

Paste into `frontend/src/app/globals.css`. Keep the `@import` lines that `npx shadcn@latest init` writes (as of shadcn 4.x docs: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`) and replace everything else with this block. The app ships one theme: tokens live in `:root`, and `<html>` carries `class="dark"` so shadcn's `dark:` variants apply.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

/* ---------- Verity tokens: brand.md 1.5 ---------- */
:root {
  /* Fixed brand colors. Do not change. */
  --verity-navy: #050A12;   /* Deep Space Navy */
  --verity-blue: #0B1220;   /* Dark Blue */
  --verity-green: #39FF88;  /* Verity Green */

  --radius: 0.375rem;

  /* Surfaces (depth = lightness, no shadows) */
  --background: var(--verity-navy);
  --surface: var(--verity-blue);
  --surface-2: oklch(22.5% 0.032 262);
  --surface-3: oklch(27% 0.034 262);

  /* Text */
  --foreground: oklch(95% 0.012 255);
  --fg-muted: oklch(76% 0.026 257);
  --fg-subtle: oklch(67% 0.028 258);
  --fg-disabled: oklch(50% 0.022 258);

  /* Lines */
  --border: oklch(29% 0.03 262);
  --border-strong: oklch(52% 0.035 260);

  /* Accent */
  --primary: var(--verity-green);
  --primary-foreground: var(--verity-navy);
  --primary-hover: oklch(91% 0.15 152);
  --primary-press: oklch(82% 0.2 151);
  --primary-muted: oklch(29% 0.07 156);

  /* Status */
  --pass: var(--verity-green);
  --pass-muted: var(--primary-muted);
  --fail: oklch(70% 0.19 22);
  --fail-muted: oklch(27% 0.075 22);
  --warn: oklch(84% 0.145 78);
  --warn-muted: oklch(28% 0.055 78);
  --info: oklch(80% 0.11 232);
  --info-muted: oklch(28% 0.06 240);

  /* shadcn semantic mapping */
  --card: var(--surface);
  --card-foreground: var(--foreground);
  --popover: var(--surface-2);
  --popover-foreground: var(--foreground);
  --secondary: var(--surface-2);
  --secondary-foreground: var(--foreground);
  --muted: var(--surface-2);
  --muted-foreground: var(--fg-muted);
  --accent: var(--surface-3); /* shadcn "accent" is a hover/selected background, NOT the brand accent */
  --accent-foreground: var(--foreground);
  --destructive: var(--fail);
  --destructive-foreground: var(--verity-navy);
  --input: var(--border-strong);
  --ring: var(--verity-green);
  --chart-1: var(--verity-green);
  --chart-2: var(--info);
  --chart-3: oklch(74% 0.12 300);
  --chart-4: var(--warn);
  --chart-5: oklch(64% 0.03 258);
  --sidebar: var(--surface);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--verity-green);
  --sidebar-primary-foreground: var(--verity-navy);
  --sidebar-accent: var(--surface-3);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--verity-green);

  /* Code */
  --code-bg: var(--verity-navy);
  --syn-plain: var(--foreground);
  --syn-punct: var(--fg-muted);
  --syn-keyword: oklch(82% 0.1 165);
  --syn-type: oklch(79% 0.095 255);
  --syn-number: oklch(85% 0.11 80);
  --syn-comment: oklch(66% 0.03 258);
  --syn-string: oklch(81% 0.09 45);
  --diff-add: oklch(25% 0.06 156);
  --diff-del: oklch(25% 0.07 22);
  --selection: oklch(35% 0.08 156);

  /* Canvas */
  --canvas-dot: oklch(31% 0.03 262);
  --edge: var(--border-strong);
  --edge-active: var(--info);
  --edge-proof: var(--verity-green);

  /* Elevation: overlays only (tooltip, popover, sheet) */
  --shadow-overlay: 0 8px 24px oklch(8% 0.02 256 / 0.55);
  /* The one glow in the system: winner moment only */
  --glow-pass: 0 0 0 1px var(--verity-green), 0 0 24px oklch(88% 0.2 151 / 0.35);

  /* Layout constants (Studio) */
  --topbar-h: 3.5rem;
  --rail-h: 3.25rem;
  --bottombar-h: 3.5rem;
  --inspector-w: 25rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* Verity additions: bg-surface-2, text-fg-muted, border-border-strong, text-pass, bg-fail-muted ... */
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-fg-disabled: var(--fg-disabled);
  --color-border-strong: var(--border-strong);
  --color-primary-hover: var(--primary-hover);
  --color-primary-press: var(--primary-press);
  --color-primary-muted: var(--primary-muted);
  --color-pass: var(--pass);
  --color-pass-muted: var(--pass-muted);
  --color-fail: var(--fail);
  --color-fail-muted: var(--fail-muted);
  --color-warn: var(--warn);
  --color-warn-muted: var(--warn-muted);
  --color-info: var(--info);
  --color-info-muted: var(--info-muted);
  --color-code-bg: var(--code-bg);
  --color-syn-plain: var(--syn-plain);
  --color-syn-punct: var(--syn-punct);
  --color-syn-keyword: var(--syn-keyword);
  --color-syn-type: var(--syn-type);
  --color-syn-number: var(--syn-number);
  --color-syn-comment: var(--syn-comment);
  --color-syn-string: var(--syn-string);
  --color-diff-add: var(--diff-add);
  --color-diff-del: var(--diff-del);

  /* Fonts: variables are set by next/font in app/layout.tsx */
  --font-sans: var(--font-atkinson), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-atkinson-mono), ui-monospace, monospace;

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
}

@theme {
  /* Product type scale = Tailwind defaults (xs 12, sm 14, base 16, xl 20, 2xl 24, 3xl 30).
     Light-on-dark: open up line-height on reading sizes. */
  --text-sm--line-height: calc(1.375 / 0.875);
  --text-base--line-height: calc(1.625 / 1);

  /* Brand (landing) fluid scale */
  --text-display: clamp(3rem, 1.6rem + 3.6vw, 6rem);
  --text-display--line-height: 1;
  --text-display--letter-spacing: -0.025em;
  --text-display--font-weight: 800;
  --text-headline: clamp(2rem, 1.5rem + 1.6vw, 3rem);
  --text-headline--line-height: 1.1;
  --text-headline--letter-spacing: -0.015em;
  --text-headline--font-weight: 700;
  --text-lead: 1.25rem;
  --text-lead--line-height: 1.6;

  /* Motion */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-toggle: cubic-bezier(0.65, 0, 0.35, 1);

  --animate-status-blink: status-blink 1.2s ease-in-out infinite;
  --animate-node-enter: node-enter 220ms cubic-bezier(0.25, 1, 0.5, 1) both;
  --animate-status-pop: status-pop 320ms cubic-bezier(0.25, 1, 0.5, 1);
  --animate-diff-outline: diff-outline 4s ease-out forwards;
  --animate-winner-glow: winner-glow 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @keyframes status-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  @keyframes node-enter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes status-pop { 0% { transform: scale(1); } 40% { transform: scale(1.3); } 100% { transform: scale(1); } }
  @keyframes diff-outline { 0%, 70% { outline-color: var(--verity-green); } 100% { outline-color: transparent; } }
  @keyframes winner-glow { 0% { box-shadow: 0 0 0 0 transparent; } 40% { box-shadow: 0 0 0 1px var(--verity-green), 0 0 40px oklch(88% 0.2 151 / 0.5); } 100% { box-shadow: var(--glow-pass); } }
}

@layer base {
  * { @apply border-border outline-ring/50; }
  html { color-scheme: dark; }
  body { @apply bg-background text-foreground font-sans antialiased; font-kerning: normal; }
  ::selection { background: var(--selection); color: var(--foreground); }
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  h1, h2, h3 { text-wrap: balance; }
  p { text-wrap: pretty; }
  code, kbd, pre, samp { font-variant-ligatures: none; }
}

/* React Flow theming. ReactFlow gets className="verity-flow" so these beat the library defaults
   regardless of stylesheet order (the library CSS is imported in components/canvas/RunCanvas.tsx).
   The library reads var(--xy-name, var(--xy-name-default)), so we set the non-default names.
   Custom nodes draw their own cards, so the built-in node color variables are not needed. */
.react-flow.verity-flow {
  --xy-background-color: var(--background);
  --xy-background-pattern-color: var(--canvas-dot);
  --xy-edge-stroke: var(--edge);
  --xy-edge-stroke-width: 1;
  --xy-edge-stroke-selected: var(--foreground);
  --xy-edge-label-color: var(--fg-muted);
  --xy-edge-label-background-color: var(--background);
  --xy-connectionline-stroke: var(--edge);
  --xy-handle-background-color: var(--surface-2);
  --xy-handle-border-color: var(--border-strong);
  --xy-controls-button-background-color: var(--surface);
  --xy-controls-button-background-color-hover: var(--surface-2);
  --xy-controls-button-color: var(--foreground);
  --xy-controls-button-color-hover: var(--foreground);
  --xy-controls-button-border-color: var(--border);
  --xy-controls-box-shadow: none;
  --xy-attribution-background-color: transparent;
}
/* The library sets outline: none on focused nodes. Restore a visible keyboard focus ring. */
.react-flow.verity-flow .react-flow__node.selectable:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: var(--radius);
}
.react-flow.verity-flow .react-flow__attribution a { color: var(--fg-subtle); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Verified 2026-10-04: this exact block compiles with `@tailwindcss/cli@4.3.3`, `tw-animate-css@1.4.0` and `shadcn@4.21.1` installed, and generates the custom utilities (`bg-surface-2`, `text-fg-muted`, `border-border-strong`, `hover:bg-primary-hover`, `text-syn-keyword`, `bg-diff-add`, `text-display`, `text-headline`, `text-lead`, `ease-out-quart`, `animate-*`) plus the overridden `text-sm` and `text-base` line-heights.

The `--xy-*` names above were checked against `@xyflow/react@12.12.0`'s `dist/style.css` on 2026-10-04 (the `--xy-theme-*` names that appear in some React Flow docs examples belong to an example theme, not the library, and are not used here). The same file sets `outline: none` on focused nodes, which is why the focus-visible rule is required.

---

## 2. Typography

### 2.1 Families (current, D12)

| Role | Family | next/font export | Weights used |
|---|---|---|---|
| Display (headline, big readouts) | Sofia Sans Extra Condensed | `Sofia_Sans_Extra_Condensed` | 800, 900 |
| Body (UI, prose) | Sofia Sans | `Sofia_Sans` | variable |
| Data (code, measured values, labels, readouts) | Martian Mono | `Martian_Mono` | variable |

Declared in `components/sections/shared/rack-fonts.ts` as `RACK_FACES` (variables `--font-rk-display`, `--font-rk-body`, `--font-rk-mono`); each page root adds `RACK_FACES`. In `globals.css` they map to `--font-display`, `--font-body` and `--font-data` (`--font-sans` is the body face, `--font-mono` the data face). Mono is for code, measured values and instrument labels.

### 2.1a Atkinson families (Superseded by D12 (2026-10-16), kept as history)

| Role | Family | next/font export | Weights used |
|---|---|---|---|
| Sans (UI, prose, headings, display) | Atkinson Hyperlegible Next | `Atkinson_Hyperlegible_Next` | variable 200 to 800; use 400, 500, 700, 800 |
| Mono (Verilog, Python, logs, measured values) | Atkinson Hyperlegible Mono | `Atkinson_Hyperlegible_Mono` | variable 200 to 800; use 400, 600 |

Why: Verity is about truth you can read. Both cuts come from the Braille Institute's legibility-first family, so no character can be mistaken for another: the mono has a slashed zero and distinct `l`, `1` and `I`, which matters in Verilog literals like `32'h0` and `1'b1`. The sans at 800 has wide round counters close to the thumbnail wordmark. One superfamily gives sans and mono a shared voice. Neither font is on impeccable's reflex-reject list. Verified on 2026-10-04: both exist in `next@16.3.8`'s Google font data with a `wght` axis, subsets `latin` and `latin-ext`, and they were rendered side by side against Chivo, JetBrains Mono, Martian Mono and Schibsted Grotesk on a Verilog sample.

`app/layout.tsx`:

```tsx
import { Atkinson_Hyperlegible_Next, Atkinson_Hyperlegible_Mono } from "next/font/google";

const sans = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap" });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], variable: "--font-atkinson-mono", display: "swap" });

// <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
```

Mono is used for literal code and measured values only (numbers with units, test vectors, hex). It is never used for headings, buttons or labels as a "technical" costume.

### 2.2 Scale

Product (Studio, Try, Results): fixed rem, Tailwind defaults with opened line-heights.

| Class | Size / line-height | Use |
|---|---|---|
| `text-xs` | 12 / 16 | Canvas node meta, badges, table meta. Minimum size anywhere. |
| `text-sm` | 14 / 22 | Default UI text: buttons, inputs, inspector, tables |
| `text-base` | 16 / 26 | Prose: captions, explanations, empty states |
| `text-xl` | 20 / 28 | Panel titles, Results section titles |
| `text-2xl` | 24 / 32 | Page titles (Try, Results) |
| `text-3xl` | 30 / 36 | Winner label on Results |

Brand (Landing): fluid, ratio at least 1.25 between steps.

| Class | Size | Weight | Use |
|---|---|---|---|
| `text-display` | 48 to 96 px (clamp) | 800, tracking -0.025em, leading 1 | Hero headline only |
| `text-headline` | 32 to 48 px (clamp) | 700, tracking -0.015em | Section headings |
| `text-lead` | 20 / 32 | 400 | Hero subhead, section intros |
| `text-base` | 16 / 26 | 400 | Body |

Rules: body measure capped at 65ch (`max-w-[65ch]`). Weights: 400 body, 500 UI labels and buttons, 700 headings, 800 display and wordmark. Sentence case everywhere; uppercase only for the four operator names and PASS/FAIL inside badges (with `tracking-wider`). Measured numbers use `font-mono` so columns align.

### 2.3 Wordmark (Superseded by D12 (2026-10-16), kept as history)

Current: the rack bar (`shared/RackBar.tsx`) shows an outlined square with a check mark and the word VERITY, linking to `/`. The text below describes the retired green-square wordmark.

"Verity" in Atkinson Hyperlegible Next 800, tracking -0.02em, `--foreground`, with the dot of the i replaced by a Verity Green square (about 0.2em, radius 0). Build it as text: `Ver` + dotless `ı` (U+0131) with an absolutely positioned green square above it + `ty`. Wrap in an element with `aria-label="Verity"` and hide the inner spans from assistive tech. Tune the square's offset visually at each size. The green square is the brand motif: status indicators are squares too.

---

## 3. Space, radius, elevation

- **Spacing:** Tailwind's 4px scale (`--spacing: 0.25rem`, unchanged). Product rhythm 4, 8, 12, 16, 24. Tight groups inside a panel (8 to 12), clear separation between panels (16 to 24). Landing sections use `py-[clamp(4rem,3rem+4vw,8rem)]`, container `max-w-[80rem]`, gutters 24px (mobile) to 48px (desktop).
- **Studio layout constants:** top bar 56px, stage rail 52px, bottom bar 56px, inspector 400px (`--inspector-w`).
- **Radii:** `--radius: 0.375rem` (6px). Badges `rounded-sm` (3.6px), buttons and inputs `rounded-md` (4.8px), cards, panels and canvas nodes `rounded-lg` (6px), landing hero frame `rounded-xl`. Status squares 2px. No pill-shaped buttons.
- **Elevation:** depth comes from surface lightness, not shadow. Level 0 `--background`, level 1 `--surface` (cards, nodes, panels), level 2 `--surface-2` (popovers, inspector header, hover), level 3 `--surface-3` (tooltips, selected rows). `--shadow-overlay` only on floating overlays. Canvas nodes have no shadow.
- **Borders:** 1px. `--border` for rest state, `--border-strong` for inputs, edges and hover. Never a thick colored border on one side of a card (banned side stripe); use a full 1px border plus a tinted background instead.

## 4. Motion

| Token | Value | Use |
|---|---|---|
| fast | 150ms, `ease-out-quart` | Hover, press, toggles |
| base | 200ms, `ease-out-quart` | Status color changes, tab switches |
| enter | 220ms, `animate-node-enter` | New node or row appears (opacity + 4px rise) |
| slow | 320ms, `ease-out-expo` | Inspector open, sheet, fitView animation |
| pop | 320ms, `animate-status-pop` | Status square on PASS or FAIL transition, once |
| blink | 1.2s loop, `animate-status-blink` | RUNNING status square only |
| diff | 4s, `animate-diff-outline` | Outline on a block or version the agent just changed |
| winner | 900ms, `animate-winner-glow` | Winner node, once. The only glow. |

Rules:
- Motion conveys state only: running, passed, failed, changed, entered. No decorative loops, no parallax, no scroll-triggered reveals.
- Landing: headline lines stagger 60ms (total under 500ms); the replay starts 600ms after first paint. The replay is the page's motion.
- Never animate width, height, top or left. Use transform and opacity; reflow with `grid-template-rows`.
- Exits run at about 75% of entry duration. No bounce or elastic easing.
- `prefers-reduced-motion: reduce`: the CSS block above zeroes durations; RUNNING shows a static square plus the word "Running"; the landing replay starts paused on its final frame with a "Play the run" button; canvas `fitView` jumps instead of animating.

## 5. Iconography

lucide-react (ISC). Size 16 in product UI, 14 in dense rows and canvas nodes, 20 on the landing. Stroke width 1.75. Every icon sits next to a text label or has an `aria-label`. Names below were checked against `lucide-react@1.51.0` type exports on 2026-10-04.

| Meaning | Icon |
|---|---|
| Pass | `Check` |
| Fail | `X` |
| Warning, cap reached | `TriangleAlert` |
| Error | `CircleAlert` |
| Info | `Info` |
| Locked golden model | `Lock` |
| Winner | `Crown` |
| Elite (kept for next round) | `Star` |
| FIX operator | `Wrench` |
| SIMPLIFY operator | `Minimize2` |
| OPTIMIZE operator | `Gauge` |
| EXPLORE operator | `Compass` |
| First draft (INIT) | `FileCode` |
| Proven equal (EQY) | `Equal` inside the badge, `ShieldCheck` on Results |
| Constraint pin | `Pin` |
| Variant toggle | `ToggleLeft` |
| Moved by you | `Hand` |
| Countdown | `Timer` |
| Hold countdown | `CirclePause` |
| Play, pause, restart, skip | `Play`, `Pause`, `RotateCcw`, `SkipForward` |
| Diff | `GitCompare` |
| Tests | `FlaskConical` |
| PPA | `Cpu` |
| RTL code | `FileCode` |
| Download zip | `Download` |
| Copy | `Copy` |
| Credits | `Coins` |
| Human inputs | `User` |
| Metric better, worse | `ArrowDown`, `ArrowUp` (lower is better for area, period, power) |

lucide no longer ships brand logos (`Github` is not exported). Link to GitHub with the text "GitHub". Do not use `Sparkles`, `Bot` or `Wand` anywhere.

## 6. Voice and copy

### 6.1 Voice

A careful engineer explaining a test bench to a smart friend: plain, exact, unhurried.

- Short declarative sentences. Present tense for live state ("Simulating 16 tests"), past tense for results ("v1 failed 3 of 16 tests").
- Say what happened, then the number, then the source: "Area 1,520 µm², -17.4% vs v1 (Yosys)" (rendered with a true minus sign, see 6.2).
- Every displayed metric carries the label **"relative to our own v1, open-source tools"** nearby (the `HonestyNote` component). Gains are never stated without the baseline.
- "Tests it", never "proves it" for simulation. "Proven equal" is used only for an EQY equivalence result.
- The AI is "the agent". The user is "you". Versions are "v1, v2 ...". The golden model is "the golden model", explained once as "the answer key".
- Sample data: while the fixture has `sample: true`, every metric surface shows a "Sample data" badge. Never ship a screen that shows sample numbers without it.
- Never present REvolution's (or any paper's) numbers as Verity's. The paper is credited in the footer as the source of the loop's principles only.

### 6.2 Mechanics

- No em dashes or en dashes anywhere (copy, code comments, alt text). Use commas, colons, parentheses or two sentences. Ranges are written "2 to 4".
- Negative deltas in the UI use the minus sign U+2212 (in code, the JavaScript string escape for code point 2212), produced only by `formatDelta()`, never typed by hand.
- Numbers: thousands separators (1,840), one decimal for percentages (17.4%), two for ns and mW (3.38 ns, 1.66 mW), currency with two decimals ($0.18). Units always: µm², ns, MHz, mW.
- Times: "10 s", "1:30" (replay clock), "about 6 minutes".
- Sentence case for all UI text. No exclamation marks. No "magic", "revolutionary", "AI-powered", "effortless", "seamless".
- Status pairs a square + word, always: `[filled amber square] PASS 16/16`, `[hollow white square] FAIL 13/16`, `[blinking pale amber square] Running`. Never red.

## 7. Do and don't

| Do | Don't |
|---|---|
| Let the replay be the hero image | Put a stock chip photo or a 3D render in the hero |
| Use amber only for pass, proven, the primary action and focus | Tint panels, headings or icons amber for "brand" |
| Show FAIL states fully, with expected vs got and the fix diff | Hide failures or skip straight to the winner |
| Put the baseline next to every number | Show "-17%" with no "vs v1" and no tool |
| Use mono for code and measured values | Use mono for headings, buttons or "techy" labels |
| Use full 1px borders and tinted fills for callouts | Use a thick colored side stripe on cards or alerts |
| Use one primary button per screen | Put two amber buttons side by side |
| Keep canvas nodes flat (surface + border) | Add drop shadows, glass blur or gradients to nodes |
| Use the winner glow once, on the winner | Glow on hover, on buttons, or on every pass |
| Keep about 12 nodes visible | Let the tree sprawl; collapse rejected versions instead |
