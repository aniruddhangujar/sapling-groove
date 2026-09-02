---
name: react-best-practices
description: >-
  Use this skill when creating, reviewing, refactoring, or debugging React
  components and hooks in Sapling. Prioritize maintainability, predictable
  state, rendering performance, and correct handling of timers, Canvas,
  Web Audio, localStorage, and AI interactions.
---

# React Best Practices for Sapling

## Architecture

Prefer:

- functional components
- React Hooks
- small focused components
- custom hooks for reusable behavior
- clear separation between UI and application logic

Do not introduce new architecture merely for the sake of abstraction.

Understand the existing codebase before refactoring it.

## State

Keep state as close as practical to where it is used.

Lift state only when multiple components genuinely need the same state.

Before introducing Context, Zustand, Redux, or another state library:

1. inspect the existing state architecture
2. determine whether local state or existing props are sufficient
3. avoid adding dependencies without a concrete need

## Sapling State Domains

Treat these as distinct concerns:

- user profile
- goals
- focus session state
- timer state
- break state
- tree growth state
- soundscape state
- Ani conversation state
- persistence state

Do not create a single giant state object if the concerns can remain isolated.

## Timers

Timers are correctness-sensitive.

Do not rely on render cycles for elapsed-time calculations.

Prefer timestamps / elapsed-time calculations over decrementing state every second.

Account for:

- browser throttling
- tab switching
- sleep/wake
- visibility changes
- timer drift
- session completion
- accidental duplicate intervals

Never create multiple active intervals for the same timer.

Clean up all timer effects.

## Canvas

Sapling's tree engine uses HTML5 Canvas.

Canvas rendering should be isolated from unrelated React renders where practical.

Avoid:

- recreating animation loops unnecessarily
- setting React state every animation frame
- allocating large objects every frame
- unnecessary canvas resizing
- leaking animation frames

Use requestAnimationFrame appropriately.

Cancel animation frames during cleanup.

Respect devicePixelRatio without creating unnecessarily huge canvases.

Support prefers-reduced-motion.

## Web Audio

Audio is browser-controlled and must respect user interaction requirements.

Handle:

- AudioContext lifecycle
- suspended contexts
- cleanup
- switching soundscapes
- mute state
- unavailable audio
- mobile browser restrictions

Never create duplicate AudioContexts unnecessarily.

## localStorage

Sapling currently persists important application state locally.

When interacting with localStorage:

- use stable keys
- handle missing values
- handle malformed JSON
- avoid excessive writes
- serialize intentionally
- preserve backward compatibility when practical

Do not silently destroy existing user data during refactors.

## Gemini / Ani

AI calls should not block the main UI.

Handle:

- loading
- errors
- cancellation where applicable
- streaming
- empty responses
- network failures
- unavailable APIs

Never expose secrets in client-side code.

## Effects

Every effect must have a clear reason to exist.

For each useEffect ask:

- What external system is this synchronizing with?
- What starts the effect?
- What stops it?
- Is cleanup guaranteed?
- Can it accidentally run twice?
- Are dependencies complete?

## Memoization

Do not use useMemo/useCallback everywhere.

Use memoization when:

- a calculation is genuinely expensive
- stable references materially reduce expensive child renders
- rendering systems such as Canvas benefit from avoiding unnecessary recreation

## Components

Prefer components with one clear responsibility.

Extract custom hooks when logic becomes difficult to reason about.

Avoid creating tiny components purely to increase file count.

## Keys

Use stable unique identifiers.

Never use array indexes as keys for mutable lists.

## Refactoring Rule

Before refactoring:

1. understand current behavior
2. identify the actual problem
3. preserve public behavior
4. make the smallest architectural change that solves the problem
5. verify existing functionality afterward