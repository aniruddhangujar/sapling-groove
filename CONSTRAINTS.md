# Sapling Groove — Project Constraints & Quality Bar

> Formulated following `constraint-driven-development` from `addyosmani/agent-skills`.
> These non-negotiable thresholds and architectural guardrails must be preserved across all pull requests and agent modifications.

## 1. Type Safety & Build Integrity
- **TypeScript**: `npx tsc --noEmit` must pass with 0 errors.
- **No Suppressions**: No `@ts-ignore`, `@ts-expect-error`, or `any` casts without explicit, documented architectural justification.
- **Build**: `npm run build` must execute cleanly in under 3.0s with zero bundling warnings.

## 2. Audio & Animation Performance
- **Web Audio Context**:
  - AudioContext must be lazily initialized or kept suspended until user gesture (adhering to browser autoplay policy).
  - Disconnect all audio nodes (`OscillatorNode`, `GainNode`, `BiquadFilterNode`) on track stop or pause to prevent audio buffer memory leaks.
  - Auto-stopping ephemeral sound nodes (such as chime generators) must attach `onended` listeners to disconnect from the audio graph.
- **Canvas Visualizer (`SaplingCanvas`)**:
  - Render loop must operate strictly via `requestAnimationFrame` with delta-time smoothing.
  - Zero heap allocations (no `new Object()`, `[]`, or closures) inside the 60fps draw loop.
  - Frame budget: Render pass must complete in under 8ms to preserve 60-120fps display refresh rates.

## 3. Bundle Sizing & Code Splitting
- **Initial Bundle Ceiling**: Main entry chunk (`index-*.js`) must not exceed 300KB uncompressed (gzip < 85KB).
- **Lazy Loading**: Non-critical modals (`GoalModal`, `FocusSession`, `AniChat`, `SanctuaryModal`, `AuthModal`) must stay split via React `lazy()` + `Suspense`.

## 4. Security & Privacy
- **Secrets Management**: No API keys, tokens, or credentials hardcoded. Use `import.meta.env.VITE_*` exclusively.
- **Git Hygiene**: `.env*` files are strictly ignored in `.gitignore` (except `.env.example`).
- **User Storage**: Local state persisted via `storageService` must validate schema shapes before reading into state to avoid crashing from corrupted cache.

## 5. Accessibility & UX
- **WCAG 2.1 AA**: Minimum 4.5:1 contrast for regular text on cyber-organic dark backgrounds (#061206 / deep forest).
- **Interactive Targets**: Minimum tap target of 36x36px on desktop and 44x44px on mobile viewports.
- **Labels**: Every icon-only button must include an unambiguous `aria-label` or `title`.

## 6. Code Simplicity & Architecture
- **Rule of 500**: Single files exceeding 500 lines should be modularized into colocated subcomponents or hooks.
- **Chesterton's Fence**: Never delete or rewrite an existing audio synthesis curve, scale definition, or state synchronization without understanding and proving exact behavioral equivalence.

## 7. Interface Feel & React 19 Standards (from ECC)
- **Zero Jitter Numerics**: All timers, stopwatches, counters, and statistics must apply `tabular-nums` (`font-variant-numeric: tabular-nums`) to eliminate horizontal layout jitter on changing digits.
- **Pure Derived State**: Never store derived state in `useEffect` (e.g. formatting elapsed time or computing totals); compute synchronously during render.
- **Anti-Template Standard**: Maintain cyber-organic solarpunk aesthetic integrity (custom HUD scanlines, bioluminescent spores, concentric border radius, tactile press feedback `scale(0.97)`). Never degrade into generic component library defaults.

