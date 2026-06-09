# Thinkly Platform: Design System & Redesign Decisions

This document establishes the premium design system, color tokens, typography, and animation guidelines for the Thinkly platform, heavily inspired by Emil Kowalski's Design Engineering philosophy and modern iOS/Apple patterns.

---

## 1. Typography, Hierarchy & Antialiasing
* **Banned Fonts:** `Inter` (as display), `Roboto`, `Arial`, `Open Sans` (which feel like basic AI templates).
* **Display & Body Font:** `Plus Jakarta Sans` (clean, geometric sans-serif that feels expensive).
* **Code & Metadata Font:** `JetBrains Mono` (gives a developer-focused, technical tool HUD aesthetic).
* **Antialiasing Overrides:** To resolve subpixel distortion or blurriness on widescreen and low-DPI monitors, the platform applies global text smoothing properties to all elements:
  * `-webkit-font-smoothing: antialiased;`
  * `-moz-osx-font-smoothing: grayscale;`
  * `text-rendering: optimizeLegibility;`
* **Color Hierarchy:**
  * Primary Headings (`text-foreground`): Pure light white in dark mode (`#F4F4F5`), dark charcoal in light mode (`#09090B`).
  * Subtitles & Details (`text-muted-foreground`): Soft neutral gray (`#8E8E93` or `#71717A`).
  * Borders (`border-border`): Hairline dividers using translucent borders to support overlay backgrounds (`rgba(255,255,255,0.08)`).

---

## 2. Color Palette & Tokens (Premium Dark Mode)
To align with high-end developer and AI tools, the interface adopts a unified dark zinc-based theme:

| Token | Class / Variable | Color Value | Description |
| --- | --- | --- | --- |
| Background | `var(--background)` | `#050505` | OLED Pitch dark canvas backplate |
| Sidebar Background | `var(--sidebar-bg)` | `#0C0C0E` | Slightly darker integrated sidebar |
| Card / Panel | `var(--node-bg)` | `#121215` | Elevated background for items & components |
| Border | `var(--border-color)`| `rgba(255,255,255,0.08)` | Subtly distinct partition boundaries |
| Primary Brand | `var(--brand-purple)` | `#8B5CF6` | Vibrant purple accent |
| Neutral Soft | `bg-thinkly-neutral-800` | `#18181B` | Medium dark button background |
| Indigo Brand | `bg-thinkly-indigo-500` | `#6366F1` | Complementary brand indicator |

---

## 3. Double-Bezel Console & Card Shells (Doppelrand)
Never place cards or panels flatly against the background. They must use the double-bezel nested architecture:
* **Dashboard Console Wrapper:**
  * Outer shell: `rounded-[2.5rem] p-2 border border-white/10 bg-white/[0.02]`
  * Inner core: `rounded-[calc(2.5rem-8px)] bg-[#0A0A0C]/90 border border-white/5`
* **Grid Card Shell:**
  * Outer shell: `rounded-[20px] p-1.5 border border-white/10 bg-white/[0.02] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)]`
  * Inner core: `rounded-[14px] bg-[#0A0A0C]/60 p-3.5` (no `overflow-hidden` at the core level to prevent popover/menu clipping).

---

## 4. Interactive Component Feedback (iOS-Style)
All pressable elements (buttons, cards, links) must provide instant tactile response:
* **Tactile Press Feedback:** Scale down on active state using `transform: scale(0.97)` (or `.active-scale` / `active:scale-[0.98]`) with a quick transition duration (`120ms` to `160ms` ease-out).
* **Button-in-Button Trailing Icon:** Action buttons feature a rounded icon container nested inside. On hover, translate the icon container (`group-hover:translate-x-0.5`) and rotate/scale the glyph inside (e.g. plus icon rotates `90deg` on hover) to create kinetic tension.
* **Mini Interactive Graph Thumbnails:** Replace static workflow icons with an SVG/HTML schema representing INPUT, API, MODEL, and OUTPUT nodes. On hover, connections animate with running dashes (`edge-animated`) and nodes scale up with glowing drop-shadows (`node-executing`).

---

## 5. HUD Console Card Metadata Layout
Ensure card metadata reads like a professional heads-up display dashboard:
* **Monospace Headers:** Display a shortened uppercase workflow ID (`ID: wf.id.slice(0, 8)`) and run metrics in monospace at the top.
* **Aligned Description Heights:** Wrap description paragraphs in a standard height bounding box (`min-h-[2rem]`) to align the footer sections across all cards in the grid.
* **Filled iOS Status Pills:** Re-architect the status pill at the bottom-left into a filled capsule with a colored status dot (e.g. glowing blue for `running`, emerald for `done`, red for `error`, zinc for `idle`).

---

## 6. Signature Animation: The "Dynamic Island"
The floating status bar center morphs width, height, and content using CSS variables and elastic easing:
* **Organic Corner-Radius Morphing:** Banned transitioning from `rounded-full` (9999px) to `rounded-[28px]`. Instead, use computed pixel radius values based on state height (e.g. `rounded-[18px]` for `h-9`, `rounded-[20px]` for `h-10`) so the corner-radius interpolates smoothly.
* **Seamless Crossfade:** Keep both the expanded container and the collapsed container mounted simultaneously inside the island, using absolute positioning, transition delays, and scale offsets to avoid blank snapping.
* **Centered Sticky Placement:** Instead of screen-fixed coordinates (`fixed left-1/2 -translate-x-1/2`), the island is mounted in a zero-height sticky flex wrapper (`sticky top-5 left-0 right-0 h-0 flex justify-center z-50 pointer-events-none`). This aligns it perfectly to the middle of the console card and shifts it automatically when the Left Sidebar is toggled.
* **Easing Curves:**
  * Snappy UI Ease-out: `cubic-bezier(0.23, 1, 0.32, 1)`
  * iOS/Elastic Spring Curve: `cubic-bezier(0.32, 0.72, 0, 1)`

---

## 7. Workspace Shell (Flow + Chat)

The workspace route group (`app/(workspace)/`) wraps **Flow** (`/dashboard`) and **Chat** (`/chat`) in a shared shell. Both pages share the left sidebar, dotted-grid canvas (`#050505`), and animated navigation between them.

### Layout & file map

```
app/(workspace)/
  layout.tsx              → WorkspaceShell wrapper
  dashboard/page.tsx      → Flow (inline double-bezel card + live DynamicIsland)
  chat/page.tsx           → Chat (MacWindowShell + WorkspaceDynamicIsland)

components/workspace/
  shell/
    WorkspaceShell.tsx           → Sidebar + Barba container + swap veil
    MacWindowShell.tsx           → Reusable macOS card + traffic lights
    WorkspaceDynamicIsland.tsx   → Island with idle defaults (Chat)
    WorkspaceDynamicIslandFrame.tsx → Shared sticky island slot + purple glow
  navigation/
    BarbaWorkspaceProvider.tsx   → Transition orchestration + useWorkspaceNavigate()
    WorkspaceLink.tsx            → Sidebar links with data-workspace-link

components/chat/
  ChatInterface.tsx              → iMessage-style split-pane UI

lib/workspace/
  transitions.ts                 → Card/island leave & enter animations
  swap-veil.ts                   → Single-arc blur veil at route swap

types/workspace/
  barba-core.d.ts                → @barba/core types (dynamic import for SSR)
```

Import from the barrel: `@/components/workspace` and `@/lib/workspace`.

### macOS window chrome

Both workspaces use authentic traffic-light controls in the title bar (`group/mac` hover reveals glyphs):

| Button | Color | Flow (`/dashboard`) | Chat (`/chat`) |
| --- | --- | --- | --- |
| Close | `#FF5F57` | Stub (no action) | Stub (no action) |
| Minimize | `#FFBD2E` | `navigate("/chat", "minimize")` | `navigate("/dashboard", "restore")` |
| Full screen | `#28C840` | Stub | Stub |

* Title bar: `h-12`, `border-b border-white/[0.05]`, `px-5`
* Right label: `font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-700` (e.g. `Flow Workspace`, `Chat Workspace`)
* Buttons: `h-3 w-3`, `hover:brightness-90`, `active:brightness-75` — **never** set `pointer-events: auto` on overlay layers above them

**MacWindowShell** (`components/workspace/shell/MacWindowShell.tsx`) is the shared card for Chat. Flow still uses an equivalent inline shell in `dashboard/page.tsx` (same tokens, same `data-workspace-card` attribute). Prefer converging Flow onto `MacWindowShell` in a future pass.

### Double-bezel card tokens (workspace)

* Outer: `rounded-[1.75rem] p-2 border border-white/10 bg-white/[0.02] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]`
* Inner: `rounded-[calc(1.75rem-8px)] bg-[#0A0A0C]/90 border border-white/5`
* Film grain: `glass-noise` overlay, `pointer-events-none`
* Transition targets: `data-workspace-card` (card), `data-workspace-island` (Dynamic Island frame)

### Chat page design

* **iMessage-inspired** split pane inside `MacWindowShell` with `padded={false}`
* Conversation list left, thread right; bubbles, typing indicator, search — see `ChatInterface.tsx`
* Sidebar nav: **Tasks** tab replaced with **Chat** (`WorkspaceLink` → `/chat`)
* Island on Chat uses `WorkspaceDynamicIsland` (simpler idle state); create/import actions navigate back to Flow

### Dynamic Island placement (Flow + Chat)

Use **`WorkspaceDynamicIslandFrame`** so the island occupies the same visual slot on both pages:

* Sticky zero-height wrapper: `sticky top-5.5`, `h-0`, `z-50`, `pointer-events-none`
* Interactive island inside: `pointer-events-auto`
* Symmetric vertical centering on height morph: collapsed states use a `marginTop` offset so expand/collapse pivots around the visual center (see `DynamicIsland.tsx`)
* Ambient glow: fixed purple blob `bg-purple-500/4 blur-[60px]` behind the island

---

## 8. Workspace Page Transitions (Barba + Next.js)

Navigation between Flow and Chat is choreographed to feel like minimizing/restoring a macOS window — not a hard route change.

### Architecture: Barba as orchestrator, Next.js as router

`@barba/core` is installed via **pnpm** (`pnpm add @barba/core`). It does **not** fetch HTML (that would fight the Next.js App Router).

* `barba.init({ prevent: () => true })` — all link clicks are handled manually
* `import("@barba/core")` runs inside `useEffect` only (avoids SSR `Element is not defined`)
* Actual navigation: `router.push(href)` after leave animation
* `WorkspaceLink` / `data-workspace-link` anchors trigger `useWorkspaceNavigate().navigate()`

### Transition modes

| Mode | Trigger | Motion language |
| --- | --- | --- |
| `minimize` | Flow → Chat (or explicit) | Card scales down, drifts down, light blur — drawer minimizes |
| `restore` | Chat → Flow (or explicit) | Card scales up from below — window restores |
| `default` | Other workspace paths | Simple crossfade |

Auto-resolved in `resolveTransitionMode()` from path namespaces (`flow` = `/dashboard`, `chat` = `/chat`).

### Choreography (current, tuned)

```
1. animateWorkspaceLeave     card + island ease-out (EASE_OUT)
2. beginSwapVeilArc          single blur arc starts
3. router.push               swap while veil is still nearly clear
4. primeWorkspaceEnter       useLayoutEffect — snap incoming DOM to handoff pose (no pop)
5. animateWorkspaceEnter     card + island ease-in (EASE_MORPH)
   ∥ finishSwapVeil           veil arc completes alongside enter
6. releaseTransition           cleanup refs, inline styles, isTransitioning
```

**Timings (minimize / restore):**

| Phase | Minimize | Restore |
| --- | --- | --- |
| Leave | 720ms | 620ms |
| Enter | 840ms | 760ms |
| Swap veil arc | 880ms (runs in parallel after push) | same |

**Easing:**

* Leave: `cubic-bezier(0.23, 1, 0.32, 1)` (EASE_OUT — responsive exit)
* Enter + veil: `cubic-bezier(0.32, 0.72, 0, 1)` (EASE_MORPH — iOS drawer)

### Swap veil (single arc — do not pre-blur before push)

Early iterations blurred **before** `router.push` and held at peak blur. That created a visible **pause** at the swap point. The current approach uses one continuous arc in `lib/workspace/swap-veil.ts`:

* Swap fires immediately after leave, while opacity ≈ 0 and blur ≈ 0
* Blur rises **after** the swap (masks any DOM flash)
* Gentle peak (~52% opacity, 6px blur) around 50–58% of the arc
* Long tail out to 100% (lingers, then clears)

Veil element: `[data-workspace-swap-veil]` in `WorkspaceShell`, `z-[60]`, tint `rgba(5, 5, 5, 0.38)` in CSS.

**Rejected approaches (documented so we don't repeat them):**

* **DOM clone / swap ghost** — misaligned clones looked wrong at the swap point
* **Ramp in → hold → push → ramp out** — perceptible freeze before swap
* **`pointer-events: auto` on the veil** — invisible veil at `opacity: 0` blocked all clicks until refresh

### Animation cleanup rules (critical)

Web Animations with `fill: forwards` will resurrect old keyframes if cancelled naïvely.

* Always `anim.commitStyles()` then `anim.cancel()` before reset (`settleVeilAnimations` / `settleAnimations`)
* Veil must stay `pointer-events: none` always; input blocking uses `isTransitioning` → `pointer-events-none` on the Barba container
* `releaseTransition()` must run on success, error, and unmount — with optional `swapVeilAnimRef` guard
* Respect `prefers-reduced-motion: reduce` — skip animations, instant navigation

### Handoff poses (`primeWorkspaceEnter`)

Incoming page is snapped to the leave end-state before first paint so the route swap does not pop:

* Minimize card: `opacity 0.45`, `scale(0.94) translateY(32px)`, `blur(3px)`
* Restore card: `opacity 0.5`, `scale(0.95) translateY(24px)`, `blur(2px)`
* Island: lighter scale/blur offsets

### Hooks & API

```ts
const { navigate, isTransitioning } = useWorkspaceNavigate();

navigate("/chat", "minimize");   // yellow traffic light
navigate("/dashboard", "restore");
```

`isTransitioning` disables pointer events on `[data-barba="container"]` during the sequence.

---

## 9. Workspace implementation checklist

When adding a new workspace page or changing transitions:

- [ ] Mark animating elements with `data-workspace-card` and/or `data-workspace-island`
- [ ] Wrap island in `WorkspaceDynamicIslandFrame` for consistent placement
- [ ] Use `WorkspaceLink` or `useWorkspaceNavigate()` — not raw `<Link>` for animated routes
- [ ] Do not put `pointer-events: auto` on full-screen overlays (veil, scrims)
- [ ] Run `commitStyles()` before cancelling Web Animations
- [ ] Test Flow ↔ Chat via sidebar **and** yellow minimize button
- [ ] Test clickability of traffic lights after several transitions (no stuck veil)
- [ ] Test with `prefers-reduced-motion` enabled

---

*Last updated: workspace transitions (swap veil arc), Chat page, MacWindowShell, Barba bridge — June 2026.*
