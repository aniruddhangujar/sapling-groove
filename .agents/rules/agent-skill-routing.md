# Agent Skill & Rule Routing Specification

> **Rule**: Do NOT invoke or load the entire skill catalog by default. Always classify incoming tasks and activate only the minimal, relevant subset of skills and rules.

## Operating Principles
1. **Precedence**:
   - **1st**: Explicit user constraints in prompt.
   - **2nd**: Sapling-specific architecture & domain contracts (`CONSTRAINTS.md`, Web Audio synthesis curves, procedural tree parameters).
   - **3rd**: Project-level rules in `.agents/rules/`.
   - **4th**: General skill guidelines in `.agents/skills/`.
2. **Minimalism**: Pick 1–3 skills tailored to the current milestone. Do not load irrelevant skills into context.

---

## 5-Step Execution Workflow

For every task, execute these 5 steps in order:

### 1. Classify the Task
Identify the domain and blast radius:
- `UI_POLISH` (styling, spacing, typography, micro-interactions, responsive mobile)
- `REACT_STATE` (hooks, component lifecycles, context, timers, pure renders)
- `AUDIO_CANVAS` (Web Audio API nodes, oscillators, noise generator, canvas draw loop)
- `REFACTORING` (simplifying large components, extracting hooks/helpers without behavior changes)
- `BUG_FIX` (reproducing, isolating, and fixing defects)
- `SECURITY` (API keys, `.env` hygiene, storage validation)
- `BUILD_CONFIG` (Vite, Tailwind v4, dependencies, TypeScript)

### 2. Select Relevant Skills & Rules
Map the classified task to the exact targeted skills:

| Task Classification | Primary Skills | Relevant Rules |
| :--- | :--- | :--- |
| **UI & Polish** | `make-interfaces-feel-better`, `frontend-design`, `mobile-design` | `.agents/rules/web-design-quality.md` |
| **React 19 & State** | `react-patterns`, `react-performance`, `react-best-practices` | `.agents/rules/react-hooks.md`, `react-patterns.md` |
| **Web Audio & Latency** | `latency-critical-systems`, `performance-optimization` | `CONSTRAINTS.md` (Section 2) |
| **Generative Visuals** | `algorithmic-art`, `frontend-design` | `CONSTRAINTS.md` (Section 2) |
| **Refactoring** | `code-simplification` | `CONSTRAINTS.md` (Section 6) |
| **Bug Fixing & Errors** | `debugging-and-error-recovery`, `error-handling` | `.agents/rules/typescript-coding-style.md` |
| **Security & Secrets** | `security-and-hardening` | `.agents/rules/react-security.md`, `CONSTRAINTS.md` (Section 4) |
| **Tailwind v4 Styling** | `tailwind-patterns` | `CONSTRAINTS.md` (Section 7) |
| **Pre-Merge Verification** | `verification-before-completion`, `code-review-and-quality` | `CONSTRAINTS.md` (Section 1) |

### 3. Inspect Existing Implementation
- Read target files and neighboring code before modifying anything.
- Understand the existing data flow, state ownership, and audio/canvas side effects.
- Observe Chesterton's Fence: understand *why* code was written that way before changing it.

### 4. Make the Smallest Coherent Change
- Implement only what is strictly necessary to satisfy the prompt.
- Avoid incidental churn, unsolicited reformatting, or speculative abstractions.
- Preserve exact audio curves, timer math, and user-facing behavior.

### 5. Verify at the Appropriate Level
- **Type safety**: `npx tsc --noEmit` (must have 0 errors).
- **Production bundle**: `npm run build` (must succeed with 0 warnings).
- **Runtime validation**: Validate in browser via Chrome DevTools MCP or browser testing when UI/audio/canvas behavior is touched.
