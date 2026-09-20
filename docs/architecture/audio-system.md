# Procedural Web Audio Synthesis

> *"Sound should breathe with the listener, not loop like a recorded tape."*

Most focus applications deliver ambient sound by bundling large, static MP3 or WAV recordings (e.g., 50MB audio files of rain or coffee shop chatter).

Sapling Groove takes a fundamentally different engineering approach: **100% client-side procedural sound synthesis** powered by the native Web Audio API.

---

## 1. Why Procedural Synthesis?

| Factor | Static Audio Files (Traditional) | Procedural Synthesis (Sapling Groove) |
| :--- | :--- | :--- |
| **Network Payload** | 10MB to 50MB per soundscape | **0 KB** (generated on-the-fly via mathematical code) |
| **Repetition Fatigue** | Noticeable 3-minute loop seams | **Infinite non-repeating** organic audio streams |
| **Latency** | Buffering delay before playback | **Instantaneous** start upon user interaction |
| **Offline Support** | Requires heavy offline caching | **100% offline resilient** by default |
| **Dynamic Tuning** | Static volume only | **Real-time modulation** of resonance, frequency, and filter cutoffs |

---

## 2. Audio Graph Architecture

The audio engine builds modular sound synthesis graphs directly inside the browser's `AudioContext`:

```text
┌─────────────────┐       ┌─────────────────┐
│ White/Pink Noise│ ───►  │ BiquadFilterNode│ ───┐
│    BufferSource │       │ (Lowpass/Rain)  │   │
└─────────────────┘       └─────────────────┘   │
                                                ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌────────────┐
│ OscillatorNode  │ ───►  │  GainNode       │ ───►  │ Master Gain     │ ───►  │ Audio      │
│ (432Hz Sine)    │       │  (Modulation)   │       │ (Volume Pill)   │       │ Destination│
└─────────────────┘       └─────────────────┘       └─────────────────┘       │ (Speakers) │
                                                ▲                             └────────────┘
┌─────────────────┐       ┌─────────────────┐   │
│ Bell Oscillators│ ───►  │ Exponential Gain│ ──┘
│ (Harmonic Bells)│       │ (Chime Decay)   │
└─────────────────┘       └─────────────────┘
```

### The Sanctuary Soundscapes
1. **Sanctuary Rain**: Synthesized by filtering continuous noise algorithms through gentle multi-pole low-pass and band-pass filters, capturing the soft, rhythmic patter of water droplets on a forest canopy.
2. **Zen Resonance (432Hz)**: Pure sinusoidal oscillation tuned to the calming 432Hz acoustic frequency, accompanied by slow sub-harmonic binaural beating that encourages mental stillness.
3. **Forest Whispers**: Pink noise modulated with slow, randomized gain sweeps, mimicking the gentle swell of wind through distant leaves.
4. **Tibetan Completion Chimes**: Multiple harmonically tuned sine oscillators decaying along an exponential curve, creating an authentic, resonant meditation bowl tone that rings out upon completing a focus ritual.

---

## 3. Web Audio Memory & Node Lifecycle Management

A critical pitfall in Web Audio applications is **audio node memory leakage**. Creating oscillators and filters without disconnecting them leaves zombie nodes circulating in the browser's audio engine thread, eventually degrading browser performance.

### Rigorous Disconnection Protocols
Sapling Groove adheres to strict memory governance:
- **Ephemeral Node Cleanup**: All one-shot sound generators (such as milestone chime bells) attach explicit `onended` event listeners:
  ```javascript
  // Example architectural pattern
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
  ```
- **Session Conclusion**: When a focus session stops or pauses, active noise buffers and oscillators are ramped smoothly to zero gain (to prevent audible audio clicks) and immediately disconnected from the master audio graph.
- **Autoplay Policy Compliance**: The `AudioContext` remains suspended until the user explicitly initiates a gesture, strictly complying with browser autoplay restrictions.
