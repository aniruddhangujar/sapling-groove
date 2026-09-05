# Agent Operating Guidelines — Sapling Groove

This repository utilizes engineering workflows and agent intelligence adapted from:
- [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) (Core lifecycle, quality gates, and verification)
- [`affaan-m/ecc`](https://github.com/affaan-m/ecc) (UI polish, React 19 performance, latency-critical systems, and anti-template web design standards)

## Core Principles
1. **Quality Gates First**: Consult `CONSTRAINTS.md` before making architectural decisions or modifying code.
2. **Anti-Template Policy**: Frontend output must look intentional, opinionated, cyber-organic, and specifically tailored to Sapling Groove. No generic templates (see `.agents/rules/web-design-quality.md`).
3. **Measure Before Optimizing**: Do not perform speculative audio or rendering micro-optimizations without profiling.
4. **Preserve Behavior (Chesterton's Fence)**: Refactor for simplicity and readability without altering audio synthesis tones, timer calculations, or goal tracking.
5. **Verification is Non-Negotiable**: Every change must compile with `npx tsc --noEmit` and build with `npm run build`.

## Skill & Rule Routing Protocol
Always consult [`.agents/rules/agent-skill-routing.md`](file:///c:/Dev/sapling-groove/.agents/rules/agent-skill-routing.md) to determine which rules and skills apply to the current task. **Do not invoke the entire skill library by default.**

For every task:
1. **Classify** the task domain (UI, State, Audio/Canvas, Refactor, Bug, Security, Config).
2. **Select** only the 1–3 relevant skills/rules.
3. **Inspect** the existing implementation before editing.
4. **Make the smallest coherent change** (minimal churn, exact behavioral preservation).
5. **Verify** the result at the appropriate level (`tsc --noEmit`, `npm run build`, browser testing).

*Sapling-specific architecture and explicit user constraints always take precedence over general skill instructions.*

## Intent to Skill Mapping
When performing tasks in Sapling Groove, invoke and follow the relevant skills:

- **UI Polish & Feel**: `make-interfaces-feel-better`, `frontend-design-direction`, `taste`
  - Apply concentric border radiuses, optical icon alignment, `tabular-nums` for counters/timers, tactile press feedback (`scale(0.97)`), and balanced headline wrapping.
- **React 19 & State Performance**: `react-performance`, `react-patterns`, `.agents/rules/react-hooks.md`
  - Eliminate waterfalls, prevent unnecessary re-render fan-outs, ensure pure renders (no derived state in `useEffect`), and clean up every subscription/interval.
- **Web Audio & Latency-Critical Systems**: `latency-critical-systems`, `performance-optimization`, `browser-testing-with-devtools`
  - Maintain <8ms frame budget in `requestAnimationFrame` loop, disconnect Web Audio nodes onended, prevent GC thrashing in hot paths.
- **Generative Art & Canvas Visuals**: `algorithmic-art`, `canvas-design`
  - Algorithmic philosophies for procedural growth in `SaplingCanvas.tsx` (noise fields, particle systems, emergent fractal branches).
- **Tailwind CSS v4 & Styling**: `tailwind-patterns`
  - CSS-first `@theme` configuration, native container queries, semantic token architecture without legacy JS configs.
- **Vite & Tooling**: `vite-patterns`
  - Safe `VITE_` env prefixing, chunk splitting, tree-shaking, and fast HMR configuration.
- **Component Refactoring**: `code-simplification`
  - Modularize monolithic components (`App.tsx`, `FocusSession.tsx`), reduce cognitive complexity, preserve exact behavior.
- **Visual QA & Testing**: `browser-qa`, `test-driven-development`
  - Smoke tests across 375px / 768px / 1440px viewports, layout shift checks, keyboard accessibility, and proof tests for timer math.
- **Security & Secrets**: `security-and-hardening`, `.agents/rules/react-security.md`
  - Isolate API keys, keep `.env*` out of version control, sanitize user inputs.
- **Error Handling**: `error-handling`, `debugging-and-error-recovery`
  - Typed errors, graceful fallbacks for browser audio restrictions, non-swallowed exceptions.
- **Quality Gates**: `constraint-driven-development`
  - Check against `CONSTRAINTS.md`.

## Lifecycle Guidelines
- **Define**: Spec goals and behavior before implementing non-trivial features.
- **Build**: Implement in small, verifiable vertical slices (`incremental-implementation`).
- **Verify**: Validate in the browser using Chrome DevTools MCP or runtime logs (`browser-testing-with-devtools`, `browser-qa`).
- **Review**: Ensure zero TypeScript errors and a clean production build before concluding any session.
