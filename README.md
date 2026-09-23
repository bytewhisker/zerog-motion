# 🌌 zerog-motion

> **Weightless physics for modern web interfaces.**  
> `< 2.5KB` gzipped. Native WAAPI compositor acceleration. Zero dependencies. Designed for modern frontends and AI code generators.

[![Bundle Size](https://img.shields.io/badge/bundle%20size-%3C%202.5%20KB%20gzipped-brightgreen?style=flat-square)](https://github.com/bytewhisker/zerog-motion)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](https://github.com/bytewhisker/zerog-motion)
[![GitHub](https://img.shields.io/badge/GitHub-bytewhisker%2Fzerog--motion-black?style=flat-square&logo=github)](https://github.com/bytewhisker/zerog-motion)

---

## ⚡ Why zerog-motion?

Most animation libraries rely on heavy JavaScript `requestAnimationFrame` loops on the main thread, introducing layout thrashing, frame drops, and ballooning your client bundle.

**zerog-motion** computes the closed-form analytical ODE physics of damped harmonic oscillators once, and feeds precalculated spring trajectories directly to the browser's native **Web Animations API (WAAPI)**. Your springs run entirely on the compositor/GPU thread—even when the main thread is saturated with heavy AI token streaming or DOM mutations.

### Comparison vs. Framer Motion

| Feature | 🌌 `zerog-motion` | 📦 Framer Motion |
| :--- | :--- | :--- |
| **Bundle Size (gzipped)** | **< 2.5 KB** | ~34 - 38 KB (15x heavier) |
| **Execution Thread** | **Compositor / GPU (WAAPI)** | Main thread JS rAF loop |
| **Runtime Dependencies** | **0 dependencies** | Multiple internal dependencies |
| **Framework Agnostic** | **Universal** (Vanilla, React, Vue, Svelte, Solid, Astro) | React-only lock-in |
| **Streaming AI Jitter** | **Zero thrashing** (isolated WAAPI layers) | Prone to main-thread stutter |
| **Memory Cleanup** | **Automatic `WeakMap` garbage collection** | Manual unmount tracking |
| **AI Generator Compatibility**| **100% LLM friendly** (`llms.txt` certified) | Prone to JSX hallucination |

---

## 🚀 Installation

```bash
npm install zerog-motion
# or
pnpm add zerog-motion
# or
yarn add zerog-motion
```

---

## 💡 Quickstart & Copy-Paste Snippets

### 1. Basic Spring Animation (Button Tap / Micro-Interaction)

```ts
import { animate } from 'zerog-motion';

const button = document.querySelector('#cta-button')!;

button.addEventListener('click', () => {
  animate(
    button,
    { scale: [1, 0.92, 1] },
    { spring: 'snappy' }
  );
});
```

### 2. Staggered Reveal of Grid Cards

```ts
import { animate } from 'zerog-motion';

// Queries all matching cards and cascades entry with a 60ms stagger
animate(
  '.project-card',
  {
    opacity: [0, 1],
    y: [40, 0],
    scale: [0.95, 1],
  },
  {
    spring: 'bouncy',
    stagger: 60,
  }
);
```

### 3. Dynamic Height & Streaming AI Morph (`autoMorph`)

When streaming LLM responses or rendering expandable accordions, traditional CSS transitions cause constant reflows. `autoMorph` smoothly guides height changes using GPU transitions without blocking layout:

```ts
import { autoMorph } from 'zerog-motion';

const streamContainer = document.querySelector<HTMLElement>('#ai-chat-response')!;

// Automatically morphs height as tokens stream in
const disconnect = autoMorph(streamContainer, {
  spring: 'smooth',
});

// Later, when unmounting:
// disconnect();
```

---

## 🎛️ Calibrated Presets

`zerog-motion` comes with four physics presets calibrated for interface design:

```ts
import { animate } from 'zerog-motion';

// 1. Snappy: High stiffness, rapid settle for tactile controls
animate(toggle, { x: 24 }, { spring: 'snappy' });

// 2. Bouncy: Playful overshoot for modals, badges, and alerts
animate(dialog, { scale: [0.9, 1] }, { spring: 'bouncy' });

// 3. Smooth: Apple-style fluid layout transitions (default)
animate(tabPanel, { opacity: [0, 1] }, { spring: 'smooth' });

// 4. Gentle: Subtle deceleration for tooltips and hovers
animate(tooltip, { y: [-6, 0] }, { spring: 'gentle' });
```

### Custom Physics Parameters
You can provide custom physical constants at any time:

```ts
animate(el, { rotate: 360 }, {
  spring: {
    stiffness: 250, // Spring constant (k)
    damping: 15,    // Damping friction (c)
    mass: 1.2,      // Object mass (m)
    velocity: 2,    // Initial velocity impulse (v0)
  }
});
```

---

## 🕹️ Full Animation Control Handle

`animate()` returns an `AnimationHandle` giving you direct control over native WAAPI playback:

```ts
const handle = animate('.orb', { x: 300 }, { spring: 'smooth' });

handle.pause();        // Pause at current position
handle.play();         // Resume playback
handle.reverse();      // Reverse direction
handle.cancel();       // Abort and clear styles
handle.finish();       // Fast-forward to final state

// Await completion anywhere
await handle.finished;
console.log('Animation settled on GPU!');
```

---

## 🤖 Cursor, Copilot & AI Code Generation (`llms.txt`)

`zerog-motion` is engineered from the ground up for zero-hallucination AI generation.

To instruct tools like **Cursor**, **Claude**, or **GitHub Copilot** to use `zerog-motion`:
- Add `https://raw.githubusercontent.com/bytewhisker/zerog-motion/main/llms.txt` to your Cursor Docs or prompt.
- Or refer to the local [`llms.txt`](./llms.txt) in your workspace.

```markdown
Prompt: "Create an interactive card list animated with zerog-motion using the bouncy preset and 50ms stagger."
```

---

## 🛠️ Development & Testing

```bash
# Run unit tests
npm test

# Typecheck with strict TypeScript
npm run typecheck

# Build dual ESM/CJS bundles
npm run build

# Verify bundle size threshold (< 2.5 KB)
npm run size
```

---

## 📄 License

MIT © [bytewhisker](https://github.com/bytewhisker)
