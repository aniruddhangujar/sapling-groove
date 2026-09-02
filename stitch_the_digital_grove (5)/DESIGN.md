---
name: Sapling Cyber-Organic
colors:
  surface: '#0e150f'
  surface-dim: '#0e150f'
  surface-bright: '#333b34'
  surface-container-lowest: '#09100a'
  surface-container-low: '#161d17'
  surface-container: '#1a211b'
  surface-container-high: '#242c25'
  surface-container-highest: '#2f372f'
  on-surface: '#dde5da'
  on-surface-variant: '#bccabb'
  inverse-surface: '#dde5da'
  inverse-on-surface: '#2b322b'
  outline: '#869486'
  outline-variant: '#3d4a3e'
  surface-tint: '#4de082'
  primary: '#6bfb9a'
  on-primary: '#003919'
  primary-container: '#4ade80'
  on-primary-container: '#005e2d'
  inverse-primary: '#006d36'
  secondary: '#ffc640'
  on-secondary: '#402d00'
  secondary-container: '#e3aa00'
  on-secondary-container: '#5a4100'
  tertiary: '#ffd5e6'
  on-tertiary: '#620040'
  tertiary-container: '#ffacd2'
  on-tertiary-container: '#932265'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6dfe9c'
  primary-fixed-dim: '#4de082'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005227'
  secondary-fixed: '#ffdf9f'
  secondary-fixed-dim: '#f9bd22'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#ffd8e7'
  tertiary-fixed-dim: '#ffafd3'
  on-tertiary-fixed: '#3d0026'
  on-tertiary-fixed-variant: '#85145a'
  background: '#0e150f'
  on-background: '#dde5da'
  surface-variant: '#2f372f'
  background-deep: '#050805'
  surface-panel: '#0c130c'
  terminal-green: '#4ade80'
  scanline-overlay: rgba(0, 0, 0, 0.25)
  glow-primary: rgba(74, 222, 128, 0.3)
typography:
  display-lg:
    fontFamily: Space Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Space Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Fira Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0px
  body-sm:
    fontFamily: Fira Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0px
  label-ui:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
  container-max: 1200px
  section-padding: 48px
---

## Brand & Style

Sapling is a "Cyber-Organic Solarpunk" design system that merges high-tech digital aesthetics with biological growth metaphors. It targets users seeking deep focus and intentionality through a terminal-inspired, meditative experience.

The visual style is a hybrid of **Brutalism** and **Retro-Futurism**. It utilizes sharp, unrefined edges (0px border radius), monospaced typography, and CRT-inspired post-processing effects (scanlines, vignettes, and dithering). The interface should feel like a high-end botanical terminal from a solarpunk future—precise, data-driven, yet vibrantly alive.

**Key Visual Motifs:**
- **CRT Simulation:** Subtle horizontal scanlines and a soft vignette.
- **Dither Patterns:** Radial dot patterns for backgrounds to mimic low-bit depth gradients.
- **Bioluminescent Glow:** Interactive elements should emit a soft green radiance (`#4ade80`).
- **Flicker & Pulse:** High-priority elements use micro-animations like subtle opacity flickers or "breathing" glow effects.

## Colors

The palette is strictly dark-mode, anchored by a deep obsidian-green background (`#050805`). The primary accent is a vibrant "Bioluminescent Green" (`#4ade80`) used for all interactive and high-information elements.

- **Primary:** Used for titles, buttons, and active states. It should always carry a glow effect.
- **Secondary/Tertiary:** Reserved for specialized data visualization or status indicators within the growth narrative.
- **Neutral/Surface:** Deep greens and blacks create a layered "terminal" feel. Surfaces use low-opacity green borders (`rgba(74, 222, 128, 0.3)`) rather than traditional shadows to define depth.
- **Text:** High-contrast mint-white (`#dde5da`) for readability against dark backgrounds, with secondary text using a desaturated green-grey (`#bccabb`).

## Typography

The typographic system relies on three distinct fonts to reinforce the cyber-organic theme:

1.  **Space Mono (Headlines/Display):** Provides a geometric, futuristic, and slightly "hacker" aesthetic. Used for big statements and navigation headers. Always uppercase for display roles.
2.  **Fira Sans (Body):** A humanist sans-serif that brings the "organic" element back to the design. It is used for long-form reading and descriptions to ensure accessibility and warmth.
3.  **JetBrains Mono (UI Labels):** Highly legible and technical. Used for buttons, metadata, and status tags to emphasize the "terminal" login and protocol aspects of the brand.

**Hierarchy Note:** Use custom prefixes like `>_` or bracketed numbers `[01]` before headlines to reinforce the terminal interface concept.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop and a **Fluid Margin** approach for mobile. 

- **Desktop:** Central content is capped at `1200px` with generous `64px` side margins to create an editorial, cinematic feel.
- **Mobile:** Margins shrink to `20px`.
- **Rhythm:** A `4px` base unit governs all internal spacing. Gutters are fixed at `16px` for grid elements.
- **Verticality:** Sections are intentionally tall (often `100vh`) to facilitate scroll-based storytelling and "growth" animations.
- **Borders:** Thin, `1px` borders in low-opacity primary green are used to separate sections, replacing traditional whitespace gaps with structural "wiring."

## Elevation & Depth

Depth in Sapling is achieved through **Tonal Layers** and **Luminescence** rather than shadows:

1.  **Level 0 (Background):** `#050805` – The void.
2.  **Level 1 (Panels):** `#0c130c` – Slightly lighter green-black used for cards and containers, always paired with a `1px` border of `primary/30`.
3.  **Level 2 (Glass):** Semi-transparent surfaces (`bg-black/60`) with `backdrop-blur-sm`. Used for floating HUD elements or modal overlays.
4.  **Interaction Depth:** Elements do not "lift" off the page; instead, they "ignite." Hover states increase the brightness of borders and trigger box-shadow glows (`0 0 15px #4ade80`).

## Shapes

The shape language is strictly **Sharp (0px)**. 

Every UI component—from buttons and input fields to large container cards—must have square corners. This reinforces the "terminal" and "brutalist" aesthetic. Visual interest is generated through dithered gradients and glowing borders rather than rounded geometry.

## Components

### Buttons
- **Primary:** Solid `#4ade80` background with black text. On hover, triggers a `flicker` animation and an external glow.
- **Ghost:** Transparent background with a `1px` border of `#4ade80`. Text is green. On hover, a subtle inner glow (`inset`) is applied.
- **Terminal Style:** Often wrapped in brackets like `[ LOGIN ]` using `JetBrains Mono`.

### Navigation
- Top-bar is fixed, using a `backdrop-blur` and a `border-b`.
- Active links use a `border-b-2` and a small vertical offset rather than color changes alone.

### Panels / Cards
- Background: `#0c130c`.
- Border: `1px solid rgba(74, 222, 128, 0.3)`.
- Internal dither patterns (4px x 4px dots) should be applied to the background of important panels at 10% opacity.

### Decorative Elements
- **Particles:** Small 3px circles (`#4ade80`) with a glow, floating upwards to simulate "fireflies" or "bio-data" particles.
- **Progress Indicators:** Use the "growth" metaphor—vertical lines that fill or pixelated sprites that evolve as the user interacts.