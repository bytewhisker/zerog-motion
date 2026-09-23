import type { SpringConfig } from '../types.js';

/**
 * Resolved spring parameters with strict defaults.
 */
export interface ResolvedSpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  velocity: number;
  precision: number;
}

/**
 * Default physical constants for spring calculations.
 */
export const DEFAULT_SPRING_CONFIG: ResolvedSpringConfig = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  velocity: 0,
  precision: 0.001,
};

/**
 * Result of solving a spring at time t (in seconds).
 */
export interface SpringState {
  /**
   * Position value at time t. Target rest position is 1.0.
   */
  position: number;

  /**
   * Instantaneous velocity at time t.
   */
  velocity: number;
}

/**
 * Internal spring solver closure returning position and velocity at time t.
 */
export type SpringSolver = (t: number) => SpringState;

/**
 * Creates an analytical ODE solver for a damped harmonic oscillator.
 * Starting condition: position = 0, target = 1, initial velocity = v0.
 *
 * Differential equation: m * x''(t) + c * x'(t) + k * (x(t) - 1) = 0
 *
 * @param config Optional spring parameters
 * @returns Pure function (tInSeconds) => { position, velocity }
 */
export function solveSpring(config?: SpringConfig): SpringSolver {
  const { stiffness: k, damping: c, mass: m, velocity: v0 } = {
    ...DEFAULT_SPRING_CONFIG,
    ...config,
  };

  // Angular frequency of undamped oscillator
  const omega0 = Math.sqrt(Math.max(0.0001, k / m));
  // Damping ratio
  const zeta = c / (2 * Math.sqrt(Math.max(0.0001, k * m)));

  // Underdamped regime (zeta < 1): Oscillates with decaying amplitude
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const A = -1;
    const B = (v0 - zeta * omega0) / omegaD;

    return (t: number): SpringState => {
      const decay = Math.exp(-zeta * omega0 * t);
      const cosVal = Math.cos(omegaD * t);
      const sinVal = Math.sin(omegaD * t);

      // y(t) = decay * (A * cos + B * sin)
      const y = decay * (A * cosVal + B * sinVal);
      // y'(t) = -zeta * omega0 * y + decay * (-A * omegaD * sin + B * omegaD * cos)
      const vy =
        -zeta * omega0 * y +
        decay * (-A * omegaD * sinVal + B * omegaD * cosVal);

      return {
        position: 1 + y,
        velocity: vy,
      };
    };
  }

  // Critically damped regime (zeta === 1): Fastest approach to target without oscillation
  if (Math.abs(zeta - 1) < 1e-5) {
    const A = -1;
    const B = v0 - omega0;

    return (t: number): SpringState => {
      const decay = Math.exp(-omega0 * t);
      const y = decay * (A + B * t);
      const vy = -omega0 * y + decay * B;

      return {
        position: 1 + y,
        velocity: vy,
      };
    };
  }

  // Overdamped regime (zeta > 1): Slow exponential approach without oscillation
  const omegaD = omega0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * omega0 + omegaD;
  const r2 = -zeta * omega0 - omegaD;
  const diff = r1 - r2;

  const C1 = (v0 + r2) / diff;
  const C2 = -(v0 + r1) / diff;

  return (t: number): SpringState => {
    const exp1 = Math.exp(r1 * t);
    const exp2 = Math.exp(r2 * t);
    const y = C1 * exp1 + C2 * exp2;
    const vy = r1 * C1 * exp1 + r2 * C2 * exp2;

    return {
      position: 1 + y,
      velocity: vy,
    };
  };
}

/**
 * Analytically derives the settle time in milliseconds for the given spring parameters.
 * Motion is settled when |position - 1| <= precision and |velocity| <= precision.
 *
 * @param config Spring parameters
 * @returns Duration in milliseconds
 */
export function deriveSpringDuration(config?: SpringConfig): number {
  const resolved = { ...DEFAULT_SPRING_CONFIG, ...config };
  const { precision } = resolved;
  const solver = solveSpring(resolved);

  // Time step for scanning in seconds
  const step = 1 / 120; // 120Hz resolution
  const maxTime = 6.0; // Hard clamp at 6 seconds to prevent runaway animations
  let settleTime = 0.1;
  let consecutiveSettled = 0;
  const requiredConsecutive = 10; // Must stay settled for 10 consecutive ticks

  for (let t = step; t <= maxTime; t += step) {
    const { position, velocity } = solver(t);
    const isSettled =
      Math.abs(position - 1) < precision && Math.abs(velocity) < precision * 5;

    if (isSettled) {
      consecutiveSettled++;
      if (consecutiveSettled >= requiredConsecutive) {
        settleTime = t - (requiredConsecutive - 1) * step;
        break;
      }
    } else {
      consecutiveSettled = 0;
      settleTime = t;
    }
  }

  // Return duration in milliseconds, clamped safely
  return Math.max(100, Math.min(6000, Math.round(settleTime * 1000)));
}

/**
 * Generates normalized spring curve progress samples between 0 and 1.
 * These progress values can be passed directly to WAAPI keyframes.
 *
 * @param config Spring configuration
 * @param durationMs Duration in milliseconds
 * @param sampleCount Number of keyframe samples to generate (default: 48)
 * @returns Array of sampled progress numbers (0 at start, ~1 at settle)
 */
export function sampleSpringProgress(
  config?: SpringConfig,
  durationMs?: number,
  sampleCount: number = 48
): number[] {
  const duration = durationMs ?? deriveSpringDuration(config);
  const durationSeconds = duration / 1000;
  const solver = solveSpring(config);

  const samples: number[] = new Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const t = (i / (sampleCount - 1)) * durationSeconds;
    const { position } = solver(t);
    // Round to 5 decimal places for clean keyframe numbers
    samples[i] = Math.round(position * 100000) / 100000;
  }

  // Ensure first sample is exactly 0 and last sample is exactly 1
  samples[0] = 0;
  samples[sampleCount - 1] = 1;

  return samples;
}
