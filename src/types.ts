/**
 * Configuration options for the physical spring solver.
 */
export interface SpringConfig {
  /**
   * Stiffness of the spring (spring constant k).
   * Controls how snappy or taut the motion feels.
   * @default 100
   */
  stiffness?: number;

  /**
   * Damping coefficient (c).
   * Controls how quickly oscillations decay.
   * @default 10
   */
  damping?: number;

  /**
   * Mass of the moving object (m).
   * Controls inertia and momentum.
   * @default 1
   */
  mass?: number;

  /**
   * Initial velocity (v0) at time t = 0.
   * @default 0
   */
  velocity?: number;

  /**
   * Settle threshold epsilon. Motion is considered settled when
   * |x(t) - 1| < precision and |v(t)| < precision.
   * @default 0.001
   */
  precision?: number;
}

/**
 * Built-in motion preset identifiers.
 */
export type PresetName = 'snappy' | 'bouncy' | 'smooth' | 'gentle';

/**
 * Transform shorthand properties mapped to hardware-accelerated CSS transforms.
 */
export interface TransformProperties {
  x?: number | string;
  y?: number | string;
  z?: number | string;
  scale?: number | string;
  scaleX?: number | string;
  scaleY?: number | string;
  rotate?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  skewX?: number | string;
  skewY?: number | string;
}

/**
 * Properties that can be animated with zerog-motion.
 * Supports transform shorthands and standard CSS properties.
 */
export type AnimatableProperties = TransformProperties & {
  opacity?: number | string;
  backgroundColor?: string;
  color?: string;
  borderRadius?: number | string;
  filter?: string;
  width?: number | string;
  height?: number | string;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  [key: string]: unknown;
};

/**
 * Keyframe definition accepting either:
 * 1. Object with values as target values or arrays `[from, to]`
 * 2. Array of keyframe property objects
 */
export type PropertyKeyframeDefinition =
  | { [K in keyof AnimatableProperties]?: AnimatableProperties[K] | AnimatableProperties[K][] }
  | AnimatableProperties[];

/**
 * Animation configuration options.
 */
export interface AnimationOptions {
  /**
   * Explicit duration in milliseconds.
   * If omitted and spring physics is used, duration is analytically derived from settle time.
   */
  duration?: number;

  /**
   * Delay before animation begins in milliseconds.
   * @default 0
   */
  delay?: number;

  /**
   * Delay after animation completes before settling in milliseconds.
   * @default 0
   */
  endDelay?: number;

  /**
   * CSS easing curve (e.g. 'ease-out', 'cubic-bezier(...)').
   * Ignored if `spring` is specified.
   */
  easing?: string;

  /**
   * Number of times the animation will repeat.
   * @default 1
   */
  iterations?: number;

  /**
   * Playback direction.
   * @default 'normal'
   */
  direction?: PlaybackDirection;

  /**
   * WAAPI fill mode.
   * @default 'forwards'
   */
  fill?: FillMode;

  /**
   * Spring physics configuration or preset name ('snappy' | 'bouncy' | 'smooth' | 'gentle').
   */
  spring?: SpringConfig | PresetName;

  /**
   * Stagger delay between sequential elements in milliseconds.
   * Applies when multiple target elements are animated.
   * @default 0
   */
  stagger?: number;

  /**
   * Callback invoked when the animation completes.
   */
  onFinish?: () => void;
}

/**
 * Handle returned by `animate()` providing unified control over native WAAPI animations.
 */
export interface AnimationHandle {
  /**
   * Resume or start playback.
   */
  play(): void;

  /**
   * Pause playback at the current frame.
   */
  pause(): void;

  /**
   * Reverse playback direction.
   */
  reverse(): void;

  /**
   * Immediately cancel animation and remove applied keyframe styles.
   */
  cancel(): void;

  /**
   * Fast-forward animation to its completed state.
   */
  finish(): void;

  /**
   * Current playback time in milliseconds.
   */
  currentTime: number | null;

  /**
   * Playback speed multiplier (1 = normal, 2 = double speed, -1 = reverse).
   */
  playbackRate: number;

  /**
   * Promise that settles when all elements' animations finish.
   */
  readonly finished: Promise<void>;

  /**
   * Array of resolved DOM Elements participating in this animation.
   */
  readonly elements: Element[];
}

/**
 * Targets that can be passed to `animate()`.
 */
export type AnimationTarget =
  | Element
  | Element[]
  | NodeListOf<Element>
  | HTMLCollection
  | string;

/**
 * Options for `autoMorph` layout / streaming transitions.
 */
export interface MorphOptions {
  /**
   * Spring physics configuration or preset name.
   * @default 'smooth'
   */
  spring?: SpringConfig | PresetName;

  /**
   * Duration override in milliseconds.
   */
  duration?: number;

  /**
   * Optional callback triggered on each resize event.
   */
  onResize?: (entry: ResizeObserverEntry) => void;
}
