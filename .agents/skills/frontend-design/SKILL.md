---
name: frontend-design
description: >-
  Use this skill when creating, modifying, or refactoring Sapling's frontend UI,
  layouts, visual components, styling, responsive behavior, or interaction design.
  Preserve Sapling's existing cyber-organic identity while improving usability,
  polish, and responsiveness.
---

# Sapling Frontend Design

## Core Principle

Sapling is a mindful productivity web application built around the metaphor of
nurturing a living digital ecosystem.

The UI must feel like a combination of:

- Cyber-organic forest
- Pixel-art game interface
- Solarpunk / biophilic computing
- CRT terminal HUD
- Calm productivity environment

Do NOT redesign Sapling into a generic SaaS dashboard.

Preserve the existing visual personality unless the user explicitly requests a
new visual direction.

## Existing Visual Identity

Primary visual language:

- Deep forest / near-black backgrounds
- Bio-green as the primary accent
- Amber for secondary emphasis
- Muted red for warnings or unhealthy states
- CRT scanlines and subtle screen texture
- Pixel corners / HUD framing
- Pixel-art visual elements
- Press Start 2P for intentionally pixelated UI
- VT323 where a terminal/retro display aesthetic is appropriate
- Modern sans-serif typography where readability requires it

Avoid:

- Generic SaaS dashboards
- Excessive glassmorphism
- Generic gradient backgrounds
- Excessive rounded cards
- Corporate design patterns
- Random decorative gradients
- Neumorphism
- Unnecessary visual effects

## Preserve Sapling's Core Experiences

Never remove or flatten these concepts during redesign:

1. Grove
   - Primary home experience
   - Existing goals and trees remain visually important

2. Ritual / Focus
   - Focus sessions should feel immersive rather than like a generic timer

3. Chronos / Pomo
   - Traditional Pomodoro-style focus mode

4. Groove
   - Free-form focus mode where focused time grows the tree

5. Tree Growth
   - Focused time visibly contributes to the tree's development

6. Nature Details
   - Grass, environmental details, birds, butterflies and other small
     animations contribute to the feeling of a living ecosystem

7. Sanctuary / Break
   - Breaks should feel restorative rather than like another dashboard screen

8. Ambient Sound
   - Preserve soundscape controls and graceful fallback behavior

9. Ani
   - Preserve the AI companion experience and its distinct identity

## Responsive Design

Sapling is a web application with a mobile-first responsive design target.

Design for:

- 320px
- 360px
- 375px
- 390px
- 414px
- 430px

Then progressively enhance for:

- tablets
- laptops
- desktop monitors

Never solve responsiveness by simply shrinking a desktop layout.

Avoid:

- fixed-width panels that overflow phones
- horizontal page scrolling
- desktop navigation squeezed into mobile
- text becoming unreadably small
- controls becoming difficult to tap
- excessive vertical stacking without hierarchy

Use:

- fluid widths
- CSS Grid
- Flexbox
- clamp()
- responsive spacing
- content-aware breakpoints
- safe-area insets where appropriate

## Interaction Design

Every interactive element should have:

- default state
- hover state where applicable
- focus-visible state
- active/pressed state
- disabled state where applicable

Animations should communicate state or reinforce Sapling's ecosystem.

Do not add animation simply because animation is possible.

## Canvas / Pixel-Art UI

Sapling's tree visualizations may use HTML5 Canvas.

Do not replace Canvas with arbitrary DOM elements unless explicitly requested.

Canvas must:

- resize correctly with its container
- respect device pixel ratio appropriately
- avoid unnecessary redraws
- pause or reduce work when not visible
- respect prefers-reduced-motion
- remain visually coherent across mobile and desktop

## Accessibility

Use semantic HTML.

Ensure:

- keyboard navigation
- visible focus indicators
- sufficient contrast
- accessible labels
- reduced-motion support
- no essential information conveyed only through animation
- touch targets of at least 44x44 CSS pixels

## Design Decision Rule

Before changing an existing component ask:

1. Is it actually broken?
2. Is it harming usability?
3. Is it non-responsive?
4. Is it inconsistent with Sapling's visual system?
5. Is there a simpler fix that preserves the current experience?

Prefer refinement over unnecessary reinvention.