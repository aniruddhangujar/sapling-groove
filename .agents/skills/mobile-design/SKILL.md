---
name: mobile-design
description: >-
  Use this skill whenever designing, modifying, or reviewing Sapling's
  responsive mobile experience. Treat phones as a first-class experience,
  not a compressed desktop layout.
---

# Sapling Mobile Design

## Core Principle

Sapling is a responsive web application.

Mobile is not a secondary breakpoint.

The interface must be intentionally designed for phones first and progressively
enhanced for tablets and desktop.

## Target Widths

Explicitly test:

- 320px
- 360px
- 375px
- 390px
- 414px
- 430px

Then test:

- tablet portrait
- tablet landscape
- laptop
- desktop

## Touch Interaction

All important controls should have a minimum effective touch target of:

44x44 CSS pixels.

Provide adequate spacing between adjacent controls to prevent accidental taps.

Do not depend on hover to communicate essential functionality.

## Navigation

Sapling's primary navigation should remain understandable on small screens.

Prefer a bottom navigation pattern or another mobile-appropriate navigation
system when appropriate.

Core destinations include concepts such as:

- Grove
- Pomo / Groove
- Logs
- Ani

Do not blindly copy desktop navigation onto a phone.

## Layout

Avoid:

- fixed desktop widths
- overflow-x
- tiny controls
- cramped toolbars
- excessive cards inside cards
- desktop sidebars compressed into narrow columns

Prefer:

- full-width content where appropriate
- fluid containers
- bottom sheets/modals when appropriate
- vertically stacked controls
- sticky controls only when they genuinely improve usability
- responsive typography and spacing

## Focus Sessions

Focus is a critical Sapling experience.

On mobile:

- timer must remain immediately readable
- primary action must be easy to reach
- tree growth must remain visually meaningful
- ambient sound controls must remain accessible
- accidental navigation away from an active session should be minimized

Do not cover the tree with unnecessary UI.

## Grove

The Grove should remain visually rich on mobile.

Do not remove the tree/nature experience merely to make the layout simpler.

Instead:

- scale visual elements intelligently
- prioritize the active goal
- collapse secondary information
- preserve the feeling of an ecosystem

## Sanctuary / Break

Break mode should remain calm and immersive.

Nature animations such as birds and butterflies may continue,
but animation should be adaptive to device capability and reduced-motion settings.

## Performance

Mobile devices have tighter CPU, GPU, memory, and battery constraints.

Be especially careful with:

- Canvas redraw loops
- Web Audio
- timers
- animation-heavy components
- large images
- unnecessary React re-renders
- expensive calculations

Prefer pausing or throttling work when the relevant UI is not visible.

## Safe Areas

Where fixed bottom controls or navigation are used, account for device safe areas:

env(safe-area-inset-bottom)

Do not allow important controls to sit underneath system UI.

## Typography

Body text must remain comfortably readable.

Avoid reducing typography simply to make more content fit.

Use responsive sizing where necessary.

## Gestures

Do not add swipe gestures or carousels merely because they are mobile patterns.

Only introduce gestures when they provide a clear benefit to Sapling's existing
interaction model.

## Verification

A mobile implementation is not complete until it has been checked for:

- horizontal overflow
- clipped text
- unreachable controls
- modal overflow
- keyboard issues
- timer visibility
- tree/canvas sizing
- navigation usability
- safe-area problems
- reduced-motion behavior