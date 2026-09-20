# WebGL Performance & Lifecycle Governance

> *"The smoothest 60 frames per second are the ones that respect the hardware budget."*

One of the primary technical challenges encountered during Sapling Groove's development was **GPU context contention and render loop efficiency**.

---

## 1. The Engineering Problem: Context Exhaustion

In early versions of the landing page and feature explorer, multiple independent 3D diorama cards rendered simultaneously. Each card instantiated its own `THREE.WebGLRenderer` context with independent animation loops, lighting calculations, and mesh geometries.

### The Consequences:
1. **Context Loss**: Mobile browsers enforce strict limits on concurrent active WebGL contexts (typically 8 to 16). Beyond this threshold, browsers silently destroy older contexts, causing black boxes and graphic crashes.
2. **Thermal Throttling**: Running 5 to 8 simultaneous `requestAnimationFrame` loops caused rapid CPU/GPU heat buildup and heavy battery drain on mobile devices.
3. **Garbage Collection Jitter**: Frequent vector allocations inside render loops triggered periodic JavaScript engine garbage collection pauses, causing noticeable frame drops.

---

## 2. The Architectural Solution: Lifecycle Governance

To achieve rock-solid 60–120fps performance across low-power mobile devices and high-refresh desktop displays, we introduced **strict lifecycle management** across all 3D canvas components.

### A. Viewport-Aware Intersection Observers
Dioramas and secondary 3D specimens do not execute render loops when scrolled out of view. An `IntersectionObserver` monitors element visibility:
- **Offscreen**: Render loop suspends immediately; render calls drop to zero.
- **Onscreen**: Loop resumes seamlessly with smoothed delta-time calculations to prevent sudden position snapping.

### B. On-Demand Modal Mounting
Complex 3D scenes (such as the full cyber-botanical diorama) are mounted lazily using React `Suspense` and `React.lazy()`. When a modal or drawer closes, the WebGL renderer is explicitly disposed:
- Geometries are traversed and deallocated (`geometry.dispose()`).
- Materials and textures are cleared from GPU memory (`material.dispose()`).
- The rendering context is detached from the DOM.

### C. Unified Active Specimen Paradigm
Rather than running multiple concurrent canvas instances across the application, active views share a single primary hero renderer. Feature preview cards utilize lightweight procedural 2D renders or static high-fidelity captures, reserving full WebGL compute for the central hero experience.

---

## 3. The 8ms Frame Budget

Modern 120Hz displays demand that frame rendering complete within ~8.3 milliseconds. Sapling Groove enforces three non-negotiable rules within its draw routines:

1. **Zero Heap Allocations in Hot Paths**: No `new Object()`, array literals `[]`, or anonymous closures inside `requestAnimationFrame` callbacks. Scratch vectors and matrices are pre-allocated and reused.
2. **Delta-Time Smoothing**: Particle drifts, floating bioluminescent spores, and branch sways scale strictly with elapsed time (`delta`), ensuring identical movement velocity regardless of whether the device runs at 30, 60, or 120Hz.
3. **Capped Pixel Density**: Device pixel ratios are clamped at `Math.min(window.devicePixelRatio, 2.0)`, eliminating the massive fill-rate penalties of 3x and 4x retina displays without any visible loss in fidelity.
