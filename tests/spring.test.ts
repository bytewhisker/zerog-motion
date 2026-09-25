import { describe, it, expect } from 'vitest';
import {
  solveSpring,
  deriveSpringDuration,
  sampleSpringProgress,
  compileSpringKeyframes,
  DEFAULT_SPRING_CONFIG,
} from '../src/core/spring.js';
import { presets } from '../src/presets/index.js';

describe('Analytical Spring Solver (solveSpring)', () => {
  it('starts at position 0 at t = 0 with 0 initial velocity', () => {
    const solver = solveSpring();
    const initial = solver(0);
    expect(initial.position).toBeCloseTo(0, 4);
    expect(initial.velocity).toBeCloseTo(0, 4);
  });

  it('correctly handles underdamped spring (overshoots target position of 1)', () => {
    // Underdamped: k = 200, c = 10, m = 1 -> zeta = 10 / (2 * sqrt(200)) ~= 0.3535 < 1
    const solver = solveSpring({ stiffness: 200, damping: 10, mass: 1 });
    let maxPosition = 0;

    for (let t = 0; t <= 1.0; t += 0.01) {
      const state = solver(t);
      if (state.position > maxPosition) {
        maxPosition = state.position;
      }
    }

    // Should overshoot 1.0
    expect(maxPosition).toBeGreaterThan(1.05);
  });

  it('correctly handles critically damped spring (zeta = 1)', () => {
    // k = 100, m = 1 -> critical damping c = 2 * sqrt(100 * 1) = 20
    const solver = solveSpring({ stiffness: 100, damping: 20, mass: 1 });
    let maxPosition = 0;

    for (let t = 0; t <= 2.0; t += 0.01) {
      const state = solver(t);
      if (state.position > maxPosition) {
        maxPosition = state.position;
      }
    }

    // Critically damped should not overshoot 1.0
    expect(maxPosition).toBeLessThanOrEqual(1.0001);
    // Should reach very close to 1.0 after 1s
    expect(solver(1.0).position).toBeGreaterThan(0.99);
  });

  it('correctly handles overdamped spring (zeta > 1)', () => {
    // k = 100, m = 1, c = 40 -> zeta = 40 / 20 = 2.0 > 1
    const solver = solveSpring({ stiffness: 100, damping: 40, mass: 1 });
    let maxPosition = 0;

    for (let t = 0; t <= 2.0; t += 0.01) {
      const state = solver(t);
      if (state.position > maxPosition) {
        maxPosition = state.position;
      }
    }

    // Overdamped never overshoots
    expect(maxPosition).toBeLessThanOrEqual(1.0001);
    expect(solver(0.1).position).toBeGreaterThan(0);
  });

  it('respects initial velocity v0', () => {
    const solverWithV0 = solveSpring({ velocity: 10 });
    const atSmallTime = solverWithV0(0.01);
    const solverNoV0 = solveSpring({ velocity: 0 });
    const atSmallTimeNoV0 = solverNoV0(0.01);

    // Initial velocity should push position ahead faster
    expect(atSmallTime.position).toBeGreaterThan(atSmallTimeNoV0.position);
  });
});

describe('Spring Duration Derivation (deriveSpringDuration)', () => {
  it('calculates a valid duration in ms within realistic UI bounds', () => {
    const duration = deriveSpringDuration(DEFAULT_SPRING_CONFIG);
    expect(duration).toBeGreaterThanOrEqual(100);
    expect(duration).toBeLessThanOrEqual(3000);
  });

  it('derives shorter settle time for snappy preset than smooth preset', () => {
    const snappyDuration = deriveSpringDuration(presets.snappy);
    const smoothDuration = deriveSpringDuration(presets.smooth);
    expect(snappyDuration).toBeLessThan(smoothDuration);
  });

  it('guarantees spring has settled at or near the derived duration', () => {
    const config = presets.smooth;
    const duration = deriveSpringDuration(config);
    const solver = solveSpring(config);

    const stateAtEnd = solver(duration / 1000);
    expect(Math.abs(stateAtEnd.position - 1)).toBeLessThan(0.02);
  });
});

describe('Spring Progress Sampling (sampleSpringProgress)', () => {
  it('generates exact number of requested keyframe progress samples', () => {
    const count = 40;
    const samples = sampleSpringProgress(presets.bouncy, 500, count);
    expect(samples).toHaveLength(count);
  });

  it('starts strictly at 0 and ends strictly at 1', () => {
    const samples = sampleSpringProgress(presets.smooth, 400);
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(1);
  });

  it('reflects overshoot for bouncy preset', () => {
    const samples = sampleSpringProgress(presets.bouncy, 600, 60);
    const hasOvershoot = samples.some((val) => val > 1.0);
    expect(hasOvershoot).toBe(true);
  });
});

describe('WAAPI Spring Keyframe Compiler (compileSpringKeyframes)', () => {
  it('compiles independent transform properties without string-parsing matrices', () => {
    const compiled = compileSpringKeyframes(
      {
        x: { from: 0, to: 200, unit: 'px' },
        rotate: { from: 0, to: 90, unit: 'deg' },
        scale: { from: 0.8, to: 1.2, unit: '' },
      },
      { stiffness: 200, damping: 15, mass: 1 },
      60
    );

    expect(compiled.keyframes.length).toBeGreaterThan(10);
    expect(compiled.duration).toBeGreaterThan(100);
    expect(compiled.stepInterval).toBeCloseTo(1000 / 60, 2);

    const firstFrame = compiled.keyframes[0];
    const lastFrame = compiled.keyframes[compiled.keyframes.length - 1];

    expect(firstFrame.offset).toBe(0);
    expect(firstFrame.translate).toBe('0px 0px');
    expect(firstFrame.rotate).toBe('0deg');
    expect(firstFrame.scale).toBe('0.8');

    expect(lastFrame.offset).toBe(1);
    expect(lastFrame.translate).toBe('200px 0px');
    expect(lastFrame.rotate).toBe('90deg');
    expect(lastFrame.scale).toBe('1.2');
  });

  it('compiles CSS custom properties (variables) for zero main-thread jank', () => {
    const compiled = compileSpringKeyframes(
      {
        '--wave-progress': { from: 0, to: 1, unit: '' },
        '--blur-radius': { from: 10, to: 0, unit: 'px' },
      },
      presets.snappy,
      60
    );

    const firstFrame = compiled.keyframes[0];
    const lastFrame = compiled.keyframes[compiled.keyframes.length - 1];

    expect(firstFrame['--wave-progress']).toBe(0);
    expect(firstFrame['--blur-radius']).toBe('10px');
    expect(lastFrame['--wave-progress']).toBe(1);
    expect(lastFrame['--blur-radius']).toBe('0px');
  });

  it('underdamped equation calculates velocity and amplitude within precision bounds at settle', () => {
    const config = { stiffness: 150, damping: 12, mass: 1, precision: 0.001 };
    const solver = solveSpring(config);
    const duration = deriveSpringDuration(config);

    const settleSeconds = duration / 1000;
    const finalState = solver(settleSeconds);

    expect(Math.abs(finalState.position - 1)).toBeLessThan(0.005);
    expect(Math.abs(finalState.velocity)).toBeLessThan(0.02);
  });
});
