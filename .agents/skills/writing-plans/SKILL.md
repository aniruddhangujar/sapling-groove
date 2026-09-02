---
name: writing-plans
description: >-
  Use this skill when planning major Sapling features, responsive redesigns,
  refactors, architectural changes, or multi-file implementation work.
  Plans must be grounded in the existing repository and must pause for approval
  before implementation.
---

# Sapling Implementation Planning

## Core Rule

Never begin a large implementation before understanding the existing codebase.

Sapling is an existing application.

The objective is usually to improve or extend it, not rebuild it from scratch.

## Phase 1 — Repository Reconnaissance

Before proposing changes, inspect:

- package.json
- application entry points
- component structure
- state management
- persistence
- styling
- routing/navigation
- Canvas implementation
- timer implementation
- audio implementation
- Ani/Gemini integration
- existing tests
- configuration

Identify:

- existing patterns
- duplicated logic
- fragile areas
- responsive problems
- architectural constraints

## Phase 2 — Preserve Existing Behavior

Document important behavior before modifying it.

Especially preserve:

- Grove
- goals
- tree species
- tree growth
- Chronos/Pomo
- Groove
- focus sessions
- Sanctuary
- soundscapes
- Ani
- localStorage persistence

Do not remove a feature because it appears unconventional.

## Phase 3 — Requirements

Translate the user's request into explicit requirements.

Separate them into:

### Must Have
Required for completion.

### Should Have
Important but secondary.

### Nice to Have
Only implement if it does not increase unnecessary complexity.

## Phase 4 — File-Level Plan

For every proposed change specify:

- `[MODIFY] path`
- `[NEW] path`
- `[DELETE] path`

Explain:

- why the file changes
- what changes inside it
- dependencies
- expected side effects

Do not list files that do not actually need modification.

## Phase 5 — Risks

Identify risks involving:

- timer correctness
- localStorage compatibility
- Canvas performance
- Web Audio lifecycle
- Gemini/API behavior
- responsive layout
- accessibility
- regressions

Use warning callouts for significant risks.

## Phase 6 — Responsive Plan

For responsive work explicitly describe behavior at:

- 320px
- 375px
- 390px
- 430px
- tablet
- desktop

Do not describe mobile as "desktop but smaller."

## Phase 7 — Verification Plan

Specify exactly how the implementation will be verified.

Include where applicable:

- typecheck
- build
- tests
- browser verification
- responsive checks
- accessibility checks
- critical user journeys
- regression checks

## Phase 8 — Approval Gate

The plan must end with:

### Approval Required

Do not modify code until the user explicitly approves the plan.

If the user requests changes to the plan, update the plan first.

## Anti-Rebuild Rule

Do not:

- replace the entire architecture without justification
- introduce a new framework unnecessarily
- replace Canvas unnecessarily
- replace localStorage unnecessarily
- remove existing features because they are unconventional
- turn Sapling into a generic productivity SaaS

Prefer incremental, explainable improvements.