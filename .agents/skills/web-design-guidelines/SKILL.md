---
name: webapp-testing
description: >-
  Use this skill when testing, debugging, or validating Sapling's web
  application. Prioritize critical user journeys, state correctness,
  responsive behavior, and regression prevention over arbitrary coverage.
---

# Sapling Web Application Testing

## Testing Philosophy

Optimize for confidence, not percentage coverage.

Do not create tests simply to increase coverage numbers.

Prioritize:

1. critical user journeys
2. state transitions
3. timer correctness
4. persistence
5. complex calculations
6. regressions
7. accessibility
8. responsive behavior

## Unit Tests

Prefer unit tests for deterministic logic such as:

- progress calculations
- maturity projections
- growth-stage calculations
- session duration calculations
- health calculations
- date/time utilities
- goal validation
- serialization/deserialization

## Integration Tests

Test interactions between:

- timer + session state
- session completion + goal progress
- goal progress + tree growth
- localStorage + application state
- sound controls + audio state
- Ani UI + AI response state

## End-to-End Tests

Use E2E testing for critical journeys rather than every component.

Important journeys include:

### Goal Creation
Create a goal → configure tree → save → verify it appears in Grove.

### Focus Session
Start session → focus → pause/resume where supported → complete → verify progress.

### Groove
Start free-form focus → accumulate time → end session → verify growth/progress.

### Persistence
Modify important state → reload → verify state survives.

### Navigation
Navigate between Grove, Pomo/Groove, Logs, and Ani.

## Timer Testing

Explicitly test:

- starting
- pausing
- resuming
- completion
- tab visibility changes
- reload behavior if applicable
- duplicate interval prevention
- timer drift-sensitive logic

Prefer fake timers for deterministic unit tests.

## Canvas Testing

Do not attempt to assert every pixel.

Instead test:

- component mounts
- canvas dimensions update
- resize handling
- cleanup
- reduced-motion behavior
- rendering loop lifecycle

Use visual/manual browser verification for actual visual appearance.

## Audio Testing

Test state transitions rather than audio waveform output.

Verify:

- play
- pause
- mute
- soundscape switching
- cleanup
- suspended AudioContext handling

## AI Testing

Mock Gemini/network dependencies.

Test:

- loading
- success
- error
- empty response
- cancellation where applicable

Never make production AI requests during automated tests.

## Accessibility

Use accessibility-oriented assertions.

Check:

- accessible names
- keyboard navigation
- focus
- semantic roles
- form labels
- contrast where tooling supports it
- reduced-motion behavior

## Responsive Testing

For UI changes, manually inspect representative phone widths.

At minimum:

- 320px
- 375px
- 390px
- 430px

Also inspect desktop.

## Regression Rule

A test is especially valuable when it protects behavior that has previously broken.

Do not rewrite working systems solely to make them easier to test unless the architectural benefit is substantial.