// ─── Core animation engine ─────────────────────────────────────────────────
export { animate, resolveTargets } from './core/animate.js';

// ─── Physics solver & math utilities ───────────────────────────────────────
export {
  solveSpring,
  deriveSpringDuration,
  sampleSpringProgress,
  DEFAULT_SPRING_CONFIG,
  type SpringSolver,
  type SpringState,
  type ResolvedSpringConfig,
} from './core/spring.js';

// ─── Timeline orchestrator ──────────────────────────────────────────────────
export { timeline } from './core/timeline.js';
export type { TimelineInstance, TimelineHandle, TimelineAddOptions, TimelinePosition } from './core/timeline.js';

// ─── Motion presets ─────────────────────────────────────────────────────────
export {
  presets,
  isPresetName,
  resolveSpringPreset,
} from './presets/index.js';

// ─── Layout & streaming primitives ──────────────────────────────────────────
export { autoMorph } from './primitives/morph.js';

// ─── Text animation suite ───────────────────────────────────────────────────
export { splitText } from './text/split.js';
export type { SplitResult, SplitOptions, SplitType } from './text/split.js';

export { scrambleText } from './text/scramble.js';
export type { ScrambleOptions, ScrambleHandle, ScrambleCharset } from './text/scramble.js';

export { animateText } from './text/animateText.js';
export type { TextAnimationOptions, TextAnimationHandle, TextPreset } from './text/animateText.js';

// ─── Scroll utilities ────────────────────────────────────────────────────────
export { scrollReveal } from './scroll/reveal.js';
export type { ScrollRevealOptions, ScrollRevealPreset } from './scroll/reveal.js';

// ─── Interaction primitives ──────────────────────────────────────────────────
export { magnetic } from './interactions/magnetic.js';
export type { MagneticOptions } from './interactions/magnetic.js';

// ─── TypeScript Types & Interfaces ──────────────────────────────────────────
export type {
  SpringConfig,
  PresetName,
  TransformProperties,
  AnimatableProperties,
  PropertyKeyframeDefinition,
  AnimationOptions,
  AnimationHandle,
  AnimationTarget,
  MorphOptions,
} from './types.js';
