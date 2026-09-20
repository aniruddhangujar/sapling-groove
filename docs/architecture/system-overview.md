# System Architecture & Topology

> *"Build systems that respect both user attention and device resources."*

Sapling Groove operates on a **client-first, privacy-respecting hybrid architecture**. The application is designed to function seamlessly offline in local soil while offering secure, zero-friction cloud synchronization when desired.

---

## 1. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT RUNTIME (BROWSER)                        │
│                                                                        │
│  ┌───────────────────┐  ┌────────────────────┐  ┌───────────────────┐  │
│  │   UI & Controls   │  │   WebGL Engine     │  │ Web Audio Engine  │  │
│  │     (React 19)    │  │ (Three.js / 60fps) │  │  (Zero-Sample)    │  │
│  └─────────┬─────────┘  └──────────┬─────────┘  └─────────┬─────────┘  │
│            │                       │                      │            │
│  ┌─────────┴───────────────────────┴──────────────────────┴─────────┐  │
│  │                 Core State Machine & Storage Layer               │  │
│  │               (Defensive Schema Validation / Local)              │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                    Cloud Sync & Serverless Boundary
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │                                                   │
           ▼                                                   ▼
┌─────────────────────┐                             ┌────────────────────┐
│  Firebase Services  │                             │ Vercel Serverless  │
│ ─────────────────── │                             │ ────────────────── │
│ • Firebase Auth     │                             │ • AI Companion API │
│ • Cloud Firestore   │                             │ • Field Reports    │
└─────────────────────┘                             └────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technologies | Architectural Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript | Strict typing, Suspense boundaries for lazy modals, pure derived renders |
| **Styling & Theme** | Tailwind CSS v4, Vanilla CSS | CSS-first `@theme` configuration, native container queries, zero legacy JS config |
| **Graphics & 3D** | Three.js, WebGL | Procedural voxel tree morphology, floating particle spores, GPU-accelerated canvas |
| **Audio Synthesis** | Web Audio API | Zero-sample procedural soundscapes, dynamic frequency modulation, zero network latency |
| **Persistence** | LocalStorage + Cloud Firestore | Local-first offline operation; transparent cloud backup for authenticated users |
| **Authentication** | Firebase Auth | Anonymous guest sessions with seamless in-place account linking (Google, GitHub) |
| **Serverless Edge** | Vercel Serverless Functions | Edge-proxied, rate-limited execution boundaries for AI co-pilot and feedback ingestion |

---

## 3. Local-First Offline Resilience

Sapling Groove adopts a **Local-First Soil** philosophy:

1. **Immediate Playability**: First-time visitors are never greeted with mandatory signup walls. They arrive directly in the Grove with a fully functional guest profile.
2. **Defensive Schema Parsing**: All data retrieved from local browser storage passes through strict structural validators. If legacy or corrupted data is detected, the system safely migrates or repairs the profile without crashing the render tree.
3. **Transparent Cloud Merge**: When a guest user chooses to sign in, their local grove, accrued focus time, and session history automatically merge with their cloud account without overwriting existing cloud achievements.

---

## 4. Repository Architecture

Sapling Groove separates its public portfolio presentation from its production infrastructure:

- **Public Repository (`aniruddhangujar/sapling-groove`)**: Serves as the public project showcase, technical documentation hub, design evolution record, and architectural case study.
- **Private Production Repository (`aniruddhangujar/sapling-groove-production`)**: Houses the complete production source code, continuous integration pipelines, automated test suites, and direct Vercel deployment webhooks.
