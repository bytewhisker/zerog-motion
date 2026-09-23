// Core animation engine
export { animate, resolveTargets } from './core/animate.js';

// Physics solver & math utilities
export {
  solveSpring,
  deriveSpringDuration,
  sampleSpringProgress,
  DEFAULT_SPRING_CONFIG,
  type SpringSolver,
  type SpringState,
  type ResolvedSpringConfig,
} from './core/spring.js';

// Motion presets
export {
  presets,
  isPresetName,
  resolveSpringPreset,
} from './presets/index.js';

// Layout & streaming primitives
export { autoMorph } from './primitives/morph.js';

// TypeScript Types & Interfaces
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
