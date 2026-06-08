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
