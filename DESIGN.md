# Design

## Visual Theme
Premium dark developer tool, characterized by deep pitch-blacks, high contrast typography, precise thin borders, and responsive tactile animations.

## Typography
- **Primary / Display Font:** `Plus Jakarta Sans` (clean, geometric grotesque).
- **Code / Metrics Font:** `JetBrains Mono` (high-density technical HUD).
- **Smooth Antialiasing Overrides:**
  - `-webkit-font-smoothing: antialiased;`
  - `-moz-osx-font-smoothing: grayscale;`
  - `text-rendering: optimizeLegibility;`
- **Typographic Scale:**
  - H1: `clamp(2rem, 5vw, 4rem)` / font-bold / letter-spacing: `-0.03em`
  - H2: `clamp(1.5rem, 4vw, 2.5rem)` / font-bold / letter-spacing: `-0.02em`
  - Body: `1rem` (16px) / font-normal / line-height: `1.6`

## Color Palette & Tokens
- **Background (`var(--background)`):** `#050505` (OLED pitch dark canvas)
- **Sidebar Background (`var(--sidebar-bg)`):** `#0C0C0E` (slightly lighter sidebar)
- **Card / Node Background (`var(--node-bg)`):** `#121215` (elevated items background)
- **Border (`var(--border-color)`):** `rgba(255,255,255,0.08)` (subtle hairline partition)
- **Primary Accent (`var(--brand-purple)`):** `#8B5CF6` (vibrant purple)
- **Secondary Accent (`bg-thinkly-indigo-500`):** `#6366F1` (complementary indigo)
- **Neutral Soft (`bg-thinkly-neutral-800`):** `#18181B` (medium-dark buttons)

## Components & Nested Structures
### 1. Double-Bezel Card Shells (Doppelrand)
Never place cards flat on the background. Use the concentric nested architecture:
- **Outer Shell Wrapper:**
  - Spacing & Borders: `border border-white/10 bg-white/[0.02] p-1.5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)]`
  - Border Radius: `rounded-[20px]` (or `rounded-[2.5rem]` for main HUD console)
- **Inner Core Content:**
  - Spacing & Borders: `bg-[#0A0A0C]/60 p-3.5 border border-white/5`
  - Border Radius: Calculated as `rounded-[calc(OuterRadius - OuterPadding)]` (e.g. `rounded-[14px]` or `rounded-[calc(2.5rem-8px)]`)
  - Note: Do not use `overflow-hidden` at the core level to prevent popover/menu clipping.

### 2. Status Pills
- Compact, filled capsules with colored status dots:
  - `Running`: glowing blue dot + translucent blue background.
  - `Success`: emerald dot + translucent emerald background.
  - `Error`: red dot + translucent red background.
  - `Idle`: zinc dot + translucent zinc background.

### 3. Button-in-Button Trailing Icons
- Action buttons feature a rounded icon container nested inside:
  - Wrapper: `rounded-full px-6 py-3 bg-thinkly-neutral-800 text-white flex items-center gap-2 group active:scale-[0.98]`
  - Icon Core: `w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform`

## Motion & Transitions
- **Easing Curves:**
  - Snappy UI Ease-out: `cubic-bezier(0.23, 1, 0.32, 1)`
  - iOS/Elastic Spring Curve: `cubic-bezier(0.32, 0.72, 0, 1)`
- **Tactile Feedback:** Apply scale-down transitions to pressable elements:
  - CSS rule: `active:scale-[0.98] transition-transform duration-150`
- **Dynamic Island signature motion:** Multi-axis morphing using computed pixel radii for smooth corner interpolation (e.g. `rounded-[18px]` for `h-9` state, `rounded-[20px]` for `h-10` state).
