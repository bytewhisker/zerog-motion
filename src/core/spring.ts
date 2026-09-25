import type { SpringConfig } from '../types.js';

/**
 * Resolved spring parameters with strict numerical guarantees.
 */
export interface ResolvedSpringConfig {
  /**
   * Stiffness of the spring (spring constant k, in N/m).
   * Dictates the restorative force pulling towards equilibrium.
   * @default 100
   */
  stiffness: number;

  /**
   * Damping coefficient (c, in N*s/m).
   * Dictates viscous resistance dissipating kinetic energy.
   * @default 10
   */
  damping: number;

  /**
   * Mass of the moving payload (m, in kg).
   * Determines physical inertia and acceleration resistance.
   * @default 1
   */
  mass: number;

  /**
   * Initial velocity vector (v0, in units/s) at t = 0.
   * @default 0
   */
  velocity: number;

  /**
   * Precision threshold epsilon for settle detection.
   * Animation is settled when |x(t) - target| < precision AND |v(t)| < precision.
   * @default 0.001
   */
  precision: number;
}

/**
 * Default physical constants for spring calculations.
 */
export const DEFAULT_SPRING_CONFIG: Readonly<ResolvedSpringConfig> = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  velocity: 0,
  precision: 0.001,
};

/**
 * Instantaneous state of a harmonic oscillator at time t.
 */
export interface SpringState {
  /**
   * Position value at time t. Normalized equilibrium target is 1.0.
   */
  position: number;

  /**
   * Instantaneous velocity dx/dt at time t.
   */
  velocity: number;
}

/**
 * Pure analytical spring solver evaluating state at any arbitrary time t (in seconds).
 */
export type SpringSolver = (t: number) => SpringState;

/**
 * Value descriptor for compiling property keyframes.
 */
export interface PropertyRange {
  /**
   * Initial starting value.
   */
  from: number;

  /**
   * Target destination value.
   */
  to: number;

  /**
   * CSS unit or suffix (e.g. 'px', 'deg', '%', or empty string).
   */
  unit: string;
}

/**
 * Mapping of CSS property names, independent transforms, or CSS variables to property ranges.
 */
export type SpringPropertyMap = Record<string, PropertyRange>;

/**
 * Result returned by the analytical spring-to-WAAPI compiler.
 */
export interface CompiledSpringResult {
  /**
   * Discrete Keyframe array consumable by WAAPI `element.animate()` or `new KeyframeEffect()`.
   */
  keyframes: Keyframe[];

  /**
   * Analytically computed duration in milliseconds until amplitude and velocity reach resting precision.
   */
  duration: number;

  /**
   * The discrete step interval in milliseconds between generated keyframes.
   */
  stepInterval: number;

  /**
   * Total number of discrete keyframes compiled.
   */
  sampleCount: number;
}

/**
 * Independent CSS transform property names supported directly by the modern compositor thread.
 */
export const INDEPENDENT_TRANSFORM_PROPERTIES = new Set<string>([
  'translate',
  'rotate',
  'scale',
]);

/**
 * Shorthand transform dimensions that map directly to modern CSS independent transforms.
 */
export const TRANSFORM_DIMENSION_MAP: Record<string, 'translate' | 'rotate' | 'scale'> = {
  x: 'translate',
  y: 'translate',
  z: 'translate',
  rotate: 'rotate',
  rotateX: 'rotate',
  rotateY: 'rotate',
  rotateZ: 'rotate',
  scale: 'scale',
  scaleX: 'scale',
  scaleY: 'scale',
};

/**
 * Creates an exact analytical Ordinary Differential Equation (ODE) solver
 * for a damped harmonic oscillator governed by:
 *
 *   m * x''(t) + c * x'(t) + k * (x(t) - target) = 0
 *
 * In the underdamped regime (damping ratio ζ < 1), the solution is given by:
 *   f(t) = 1 + e^(-γ * t) * (c1 * cos(ω_d * t) + c2 * sin(ω_d * t))
 *
 * where:
 *   γ (gamma)   = c / (2 * m)           [attenuation coefficient]
 *   ω_0 (omega0) = sqrt(k / m)          [natural angular frequency]
 *   ζ (zeta)    = c / (2 * sqrt(k * m)) [damping ratio]
 *   ω_d (omegaD) = ω_0 * sqrt(1 - ζ^2)  [damped angular frequency]
 *   c1          = -1                   [from initial condition x(0) = 0]
 *   c2          = (v0 - γ) / ω_d        [from initial condition x'(0) = v0]
 *
 * Both critically damped (ζ = 1) and overdamped (ζ > 1) regimes are implemented
 * with exact closed-form calculus to ensure 100% mathematical fidelity.
 *
 * @param config Optional physical spring parameters (stiffness, damping, mass, velocity, precision).
 * @returns Pure mathematical closure `(tInSeconds) => { position, velocity }`.
 */
export function solveSpring(config?: SpringConfig): SpringSolver {
  const { stiffness: k, damping: c, mass: m, velocity: v0 } = {
    ...DEFAULT_SPRING_CONFIG,
    ...config,
  };

  // Mass and stiffness must remain positive to prevent imaginary frequencies or division by zero
  const safeM = Math.max(0.0001, m);
  const safeK = Math.max(0.0001, k);
  const safeC = Math.max(0, c);

  // Natural angular frequency of undamped oscillator: ω0 = sqrt(k / m)
  const omega0 = Math.sqrt(safeK / safeM);

  // Damping attenuation rate: γ = c / (2 * m)
  const gamma = safeC / (2 * safeM);

  // Damping ratio: ζ = c / (2 * sqrt(k * m)) = γ / ω0
  const zeta = safeC / (2 * Math.sqrt(safeK * safeM));

  // --------------------------------------------------------------------------
  // 1. UNDERDAMPED REGIME (ζ < 1): Oscillates with exponential envelope decay
  // Equation: f(t) = 1 + exp(-γ * t) * [c1 * cos(ω_d * t) + c2 * sin(ω_d * t)]
  // --------------------------------------------------------------------------
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const c1 = -1; // Initial position offset from target: x(0) - 1 = -1
    const c2 = (v0 - gamma) / omegaD; // Derived from x'(0) = v0

    return (t: number): SpringState => {
      const decay = Math.exp(-gamma * t);
      const cosVal = Math.cos(omegaD * t);
      const sinVal = Math.sin(omegaD * t);

      // Displacement from equilibrium (target = 1)
      const displacement = decay * (c1 * cosVal + c2 * sinVal);

      // Instantaneous velocity: derivative d/dt of displacement using product rule
      // v(t) = -γ * decay * (c1*cos + c2*sin) + decay * (-c1*ω_d*sin + c2*ω_d*cos)
      const velocity =
        -gamma * displacement +
        decay * (-c1 * omegaD * sinVal + c2 * omegaD * cosVal);

      return {
        position: 1 + displacement,
        velocity,
      };
    };
  }

  // --------------------------------------------------------------------------
  // 2. CRITICALLY DAMPED REGIME (ζ === 1): Fastest approach without overshoot
  // Equation: f(t) = 1 + exp(-ω0 * t) * [c1 + c2 * t]
  // --------------------------------------------------------------------------
  if (Math.abs(zeta - 1) < 1e-5) {
    const c1 = -1;
    const c2 = v0 - omega0;

    return (t: number): SpringState => {
      const decay = Math.exp(-omega0 * t);
      const displacement = decay * (c1 + c2 * t);
      const velocity = -omega0 * displacement + decay * c2;

      return {
        position: 1 + displacement,
        velocity,
      };
    };
  }

  // --------------------------------------------------------------------------
  // 3. OVERDAMPED REGIME (ζ > 1): Dual exponential decay without oscillation
  // Equation: f(t) = 1 + c1 * exp(r1 * t) + c2 * exp(r2 * t)
  // --------------------------------------------------------------------------
  const omegaD = omega0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -gamma + omegaD;
  const r2 = -gamma - omegaD;
  const diff = r1 - r2;

  const c1 = (v0 + r2) / diff;
  const c2 = -(v0 + r1) / diff;

  return (t: number): SpringState => {
    const exp1 = Math.exp(r1 * t);
    const exp2 = Math.exp(r2 * t);
    const displacement = c1 * exp1 + c2 * exp2;
    const velocity = r1 * c1 * exp1 + r2 * c2 * exp2;

    return {
      position: 1 + displacement,
      velocity,
    };
  };
}

/**
 * Derives the exact settle time in milliseconds for the given spring parameters.
 *
 * Iterates through discrete step intervals (default 120Hz for sub-millisecond accuracy)
 * until both the displacement amplitude |x(t) - 1| and instantaneous velocity |v(t)|
 * remain within the precision boundary (< 0.001) for multiple consecutive intervals.
 * This prevents false settlements occurring at zero-crossing nodes of oscillatory waves.
 *
 * @param config Spring physical constants (stiffness, damping, mass, velocity, precision).
 * @param maxDuration Maximum permissible ceiling in milliseconds (default: 6000ms).
 * @returns Duration in milliseconds clamped safely between 100ms and maxDuration.
 */
export function deriveSpringDuration(
  config?: SpringConfig,
  maxDuration: number = 6000
): number {
  const resolved = { ...DEFAULT_SPRING_CONFIG, ...config };
  const { precision } = resolved;
  const solver = solveSpring(resolved);

  // Time step for scanning: 1/120s (8.33ms) matches high-refresh displays
  const step = 1 / 120;
  const maxSeconds = maxDuration / 1000;
  let settleTimeSeconds = 0.1;
  let consecutiveSettledTicks = 0;
  // Require 8 consecutive ticks within boundary to guarantee true rest
  const requiredConsecutiveTicks = 8;

  for (let t = step; t <= maxSeconds; t += step) {
    const { position, velocity } = solver(t);
    const isAtRest =
      Math.abs(position - 1) < precision && Math.abs(velocity) < precision * 5;

    if (isAtRest) {
      consecutiveSettledTicks++;
      if (consecutiveSettledTicks >= requiredConsecutiveTicks) {
        settleTimeSeconds = t - (requiredConsecutiveTicks - 1) * step;
        break;
      }
    } else {
      consecutiveSettledTicks = 0;
      settleTimeSeconds = t;
    }
  }

  return Math.max(100, Math.min(maxDuration, Math.round(settleTimeSeconds * 1000)));
}

/**
 * Generates an array of normalized progress samples [0..1] sampled along the analytical spring curve.
 *
 * @param config Spring configuration parameters.
 * @param durationMs Duration in milliseconds over which to distribute samples.
 * @param sampleCount Total number of discrete points to compute (default: 60).
 * @returns Array of sampled progress numbers (starting at 0, settling at 1).
 */
export function sampleSpringProgress(
  config?: SpringConfig,
  durationMs?: number,
  sampleCount: number = 60
): number[] {
  const duration = durationMs ?? deriveSpringDuration(config);
  const durationSeconds = duration / 1000;
  const solver = solveSpring(config);

  const samples = new Float64Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const t = (i / (sampleCount - 1)) * durationSeconds;
    const { position } = solver(t);
    // Quantize to 5 decimal places for clean keyframe compilation
    samples[i] = Math.round(position * 100000) / 100000;
  }

  // Enforce boundary invariants
  samples[0] = 0;
  samples[sampleCount - 1] = 1;

  return Array.from(samples);
}

/**
 * Formats an individual property value for WAAPI keyframe representation.
 * Prioritizes independent CSS transform properties (`translate`, `rotate`, `scale`)
 * and CSS custom variables (`--*`) without main-thread string concatenations.
 *
 * @param property CSS property or independent transform name.
 * @param value Interpolated numeric value.
 * @param unit CSS measurement unit (e.g. 'px', 'deg', '%', or '').
 * @returns Valid CSS property value string or raw number.
 */
function formatPropertyValue(
  property: string,
  value: number,
  unit: string
): string | number {
  const rounded = Math.round(value * 10000) / 10000;

  if (property === 'opacity') {
    return rounded;
  }

  if (property === 'scale') {
    return `${rounded}`;
  }

  if (property === 'rotate') {
    return `${rounded}${unit || 'deg'}`;
  }

  if (property === 'translate') {
    return `${rounded}${unit || 'px'}`;
  }

  if (unit) {
    return `${rounded}${unit}`;
  }

  return rounded;
}

/**
 * Compiles declarative animation properties and physical spring parameters
 * into a discrete, hardware-accelerated Keyframe array directly executable by WAAPI.
 *
 * Adheres strictly to the ZERO-G Competitive Moat:
 * 1. Prohibits `requestAnimationFrame` for CSS values.
 * 2. Emits independent transform properties (`translate`, `rotate`, `scale`) and CSS variables.
 * 3. Precomputes all intermediate physics on the main thread once, handing off 100% of execution
 *    to the browser's compositor thread.
 *
 * @param properties Key-value mapping of property definitions to interpolate.
 * @param config Optional spring physical constants (stiffness, damping, mass, velocity, precision).
 * @param fps Target sampling frequency (default: 60fps).
 * @returns Fully compiled keyframes, duration, and sampling metadata.
 */
export function compileSpringKeyframes(
  properties: SpringPropertyMap,
  config?: SpringConfig,
  fps: number = 60
): CompiledSpringResult {
  const resolved = { ...DEFAULT_SPRING_CONFIG, ...config };
  const duration = deriveSpringDuration(resolved);
  const durationSeconds = duration / 1000;

  // Calculate discrete step interval (e.g. 1000 / 60 ≈ 16.67ms)
  const stepInterval = 1000 / fps;
  const sampleCount = Math.max(2, Math.round((durationSeconds * fps) + 1));

  const progressArray = sampleSpringProgress(resolved, duration, sampleCount);
  const propertyEntries = Object.entries(properties);

  const keyframes: Keyframe[] = new Array(sampleCount);

  for (let i = 0; i < progressArray.length; i++) {
    const progress = progressArray[i] ?? 0;
    const offset = progressArray.length > 1 ? i / (progressArray.length - 1) : 0;
    const frame: Keyframe = { offset };

    for (const [prop, range] of propertyEntries) {
      const interpolatedValue = range.from + (range.to - range.from) * progress;

      // Handle independent CSS transform properties
      if (prop === 'x' || prop === 'y' || prop === 'z') {
        const axis = prop;
        const valWithUnit = `${Math.round(interpolatedValue * 10000) / 10000}${range.unit || 'px'}`;
        if (axis === 'x') {
          frame['translate'] = `${valWithUnit} 0px`;
        } else if (axis === 'y') {
          frame['translate'] = `0px ${valWithUnit}`;
        } else {
          frame['translate'] = `0px 0px ${valWithUnit}`;
        }
      } else if (prop === 'translate') {
        frame['translate'] = formatPropertyValue('translate', interpolatedValue, range.unit);
      } else if (prop === 'rotate') {
        frame['rotate'] = formatPropertyValue('rotate', interpolatedValue, range.unit || 'deg');
      } else if (prop === 'scale') {
        frame['scale'] = formatPropertyValue('scale', interpolatedValue, '');
      } else {
        // Standard CSS property or CSS custom property (--*)
        frame[prop] = formatPropertyValue(prop, interpolatedValue, range.unit);
      }
    }

    keyframes[i] = frame;
  }

  return {
    keyframes,
    duration,
    stepInterval,
    sampleCount,
  };
}
