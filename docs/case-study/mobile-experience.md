# Mobile Experience & Viewport Ergonomics

> *"A mobile interface is not a squished desktop screen. It is an instrument held in human hands."*

Mobile productivity tools are notorious for broken viewport boundaries: keyboards pushing buttons offscreen, browser URL bars causing vertical jitter, and navigation bars overlapping interactive controls.

Sapling Groove treats mobile touch devices as first-class physical instruments.

---

## 1. The Dynamic Viewport Challenge: 100svh vs. 100vh

On modern mobile browsers (iOS Safari, Android Chrome, and Firefox Mobile), the traditional CSS unit `100vh` represents the viewport height *assuming URL and navigation chrome are completely hidden*.

When address bars expand or contract during scrolling, `100vh` causes bottom elements (such as audio bars and primary navigation) to clip beneath the screen edge or jump erratically.

### The Architectural Solution
Sapling Groove utilizes the Small Viewport Height (`100svh`) combined with fallbacks:

```css
/* Responsive full-height shell */
.app-viewport-shell {
  min-height: 100vh;
  min-height: 100svh;
  height: 100svh;
}
```

By anchoring the outer application layout to the smallest possible viewport state, bottom navigation and floating HUD controls remain rock-solid regardless of browser address bar animations.

---

## 2. Safe Area Insets & Thumb-Zone Ergonomics

Mobile devices feature diverse physical cutouts: Dynamic Islands, camera notches, rounded display corners, and operating system gesture bars.

### Dynamic CSS Environment Variables
Layout offsets dynamically read hardware safe areas:

```css
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
  --bottom-nav-height: calc(4.75rem + var(--sab));
}

@media (min-width: 640px) {
  :root {
    --bottom-nav-height: calc(6.5rem + var(--sab));
  }
}
```

### Bottom Navigation Clearance
All scrollable views, dashboard metrics, and chat threads include dedicated bottom padding (`pb-safe-nav`) referencing `--bottom-nav-height`. This guarantees that the lowest card or message never gets obscured by floating navigation pills or OS home indicator bars.

---

## 3. Touch Targets & Interaction Standards

Small screens demand forgiving hit areas. Following mobile accessibility guidelines:

- **Minimum Tap Target**: Every interactive button, tab, and icon trigger maintains a minimum touch boundary of **44x44 CSS pixels** on mobile viewports.
- **Thumb Reachability**: Primary action triggers (starting a ritual, switching soundscapes, opening Ani chat) are concentrated within the lower two-thirds of the screen.
- **Tactile Gesture Feedback**: Taps trigger immediate visual feedback with zero 300ms click delay (`touch-action: manipulation`).

---

## 4. Responsive 3D Canvas Scaling

On desktop, the procedural 3D world spans a vast cinematic panorama. On mobile:
- The WebGL rendering pipeline scales pixel density dynamically (`window.devicePixelRatio` capped at 2.0 to prevent thermal throttling and battery drain).
- Touch drag gestures allow 360-degree orbit around the central hero specimen with smoothed damping.
- When modals or chat drawers slide open, the background canvas automatically throttles non-essential animations, preserving 60fps rendering fluidity.
