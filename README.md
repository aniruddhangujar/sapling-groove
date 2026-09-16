# Sapling Groove 🌲

> A mindful, cyber-botanical focus environment and digital productivity sanctuary.

Sapling Groove transforms your daily attention into living, procedural botanical monuments. Built for deep focus sessions, study rituals, and habit cultivation without digital noise, ads, or attention traps.

---

## 🏛️ Core Features

- **The Grove**: Your personal sanctuary of procedural trees. Track your intentions as they evolve from a sprouting seed to a towering, permanent mature canopy.
- **Focus Modes**:
  - **Chronos**: Circular countdown rituals (15m, 25m, 45m, 60m) with focused ambient soundscapes.
  - **Groove**: Free-form open-ended focus mode where your tree grows organically until you conclude.
- **Focus Observatory (Dashboard)**: Comprehensive deterministic analytics tracking your focus velocity, daily rhythms, attention fields, and species diversity.
- **Ani — Quiet Companion**: An observant, grounded AI focus companion tuned to your grove's growth.
- **Sanctuary Soundscapes**: Client-side synthesized binaural and ambient soundscapes (Zen 432Hz, Forest Whispers, Sanctuary Rain, Silence).
- **Identity Lattice**: Seamless transition between private offline guest mode and authenticated cross-device cloud sync.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Graphics & 3D**: Three.js, procedural voxel generator, WebGL canvas shaders
- **Audio**: Low-latency Web Audio API procedural synthesis
- **Backend & Cloud**: Firebase Authentication, Cloud Firestore
- **Serverless APIs**: Vercel Serverless Functions (`/api/feedback`, `/api/ani`)
- **Bundle & Tooling**: Vite 6, Rollup code splitting, PWA capabilities

---

## 🌿 Community, Feedback & Support

### Support the Grove
**Sapling's core experience is free to use.**

Sapling Groove is developed and maintained as a quiet sanctuary for students, engineers, and independent thinkers. We do not sell user data, run advertisements, or gate core productivity features behind paywalls.

If Sapling brings stillness and clarity to your work, voluntary contributions help sustain hosting, serverless compute, and continuous maintenance:
- **[Support via GitHub Sponsors](https://github.com/sponsors/aniruddhangujar)**

### Field Reports & Feedback
Found a bug, want to suggest an enhancement, or share how Sapling feels during your rituals?
- Use the in-app **Field Report** interface (available in the Landing page footer, desktop Grove header, or Observatory).
- Or submit directly to our **[GitHub Issues](https://github.com/aniruddhangujar/sapling-groove/issues)**.

### Privacy Architecture & Data Handling
- **No Third-Party Analytics or Advertising Beacons**: Does not embed Google Analytics, Meta Pixel, cross-site trackers, or marketing cookies.
- **Local-First Soil**: All session records, tree morphology, and preferences function offline in local browser storage.
- **Zero IP Persistence**: Field reports processed by `/api/feedback` do not persist client IP addresses, IP hashes, or HMAC fingerprints to Firestore.
- **Offline Draft Retention**: In-transit network interruptions trigger local draft preservation, which reduces accidental data loss.
- **Best-Effort Abuse Protection**: The serverless feedback endpoint utilizes best-effort in-memory sliding-window rate limiting per container instance, a 10KB body size ceiling, and bot honeypot validation.

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/aniruddhangujar/sapling-groove.git
cd sapling-groove

# Install dependencies
npm install

# Run the local development server
npm run dev
```

The app will be accessible at `http://localhost:3000/`.

### Available Scripts
```bash
# Run type check
npx tsc --noEmit

# Run automated tests
npx tsx tests/feedback.test.ts
npx tsx tests/treeLifecycle.test.ts
npx tsx tests/dashboardAnalytics.test.ts
npx tsx tests/groveTour.test.ts

# Production build
npm run build
```

---

## 📜 License
MIT © Aniruddha Gujar
