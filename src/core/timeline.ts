/**
 * @module timeline
 * Sequence orchestration engine for zerog-motion.
 * Provides a GSAP-style imperative timeline with spring physics.
 *
 * @example
 * ```ts
 * const tl = timeline()
 *   .add('.hero-title',  { y: [40, 0], opacity: [0, 1] }, { spring: 'snappy' })
 *   .add('.hero-sub',    { y: [20, 0], opacity: [0, 1] }, { spring: 'smooth', at: '+=100' })
 *   .add('.hero-badge',  { scale: [0, 1] },               { spring: 'bouncy', at: 0.5 })
 *   .play();
 *
 * await tl.finished;
 * ```
 */

import { animate, resolveTargets } from './animate.js';
import { deriveSpringDuration } from './spring.js';
import { resolveSpringPreset } from '../presets/index.js';
import type {
  AnimationTarget,
  PropertyKeyframeDefinition,
  AnimationOptions,
} from '../types.js';

/**
 * Position of a timeline entry.
 * - `number`: absolute time in ms from timeline start
 * - `'<'`: starts at the same time as the previous entry
 * - `'<+={n}'`: starts {n}ms after the start of the previous entry
 * - `'+={n}'`: starts {n}ms after the end of the previous entry (default)
 * - `'-={n}'`: starts {n}ms before the end of the previous entry
 */
export type TimelinePosition = number | '<' | `<+=${number}` | `+=${number}` | `-=${number}`;

export interface TimelineEntry {
  target: AnimationTarget;
  keyframes: PropertyKeyframeDefinition;
  options: AnimationOptions;
  /** Resolved start time in ms */
  startTime: number;
  /** Resolved duration in ms */
  duration: number;
}

export interface TimelineHandle {
  /** Start playback */
  play(): TimelineHandle;
  /** Pause all animations */
  pause(): TimelineHandle;
  /** Cancel all animations */
  cancel(): TimelineHandle;
  /** Jump to a specific time (ms). Useful for scroll scrubbing. */
  seek(time: number): TimelineHandle;
  /** Total computed duration of the timeline in ms */
  readonly totalDuration: number;
  /** Resolves when all animations complete */
  readonly finished: Promise<void>;
}

export interface TimelineAddOptions extends AnimationOptions {
  /**
   * When to start this entry in the timeline.
   * @default '+=' (immediately after previous entry ends)
   */
  at?: TimelinePosition;
}

export interface TimelineInstance {
  /**
   * Add an animation entry to the timeline.
   */
  add(
    target: AnimationTarget,
    keyframes: PropertyKeyframeDefinition,
    options?: TimelineAddOptions
  ): TimelineInstance;

  /**
   * Add a pause/label at a given position.
   * Useful for inserting gaps.
   */
  addDelay(ms: number, at?: TimelinePosition): TimelineInstance;

  /**
   * Start playback and return a handle for control.
   */
  play(): TimelineHandle;
}

/**
 * Creates a new timeline instance.
 */
export function timeline(): TimelineInstance {
  const entries: TimelineEntry[] = [];
  let cursor = 0; // current end-of-last-entry time

  function resolveAt(at: TimelinePosition | undefined, _entryDuration: number): number {
    if (at === undefined || at === `+=${0}`) {
      return cursor;
    }
    if (typeof at === 'number') {
      return at;
    }
    if (at === '<') {
      // Same time as previous entry start
      const prev = entries[entries.length - 1];
      return prev ? prev.startTime : 0;
    }
    if (typeof at === 'string') {
      // '+={n}' — n ms after cursor
      const plusMatch = at.match(/^\+=(\d+(?:\.\d+)?)$/);
      if (plusMatch && plusMatch[1]) {
        return cursor + parseFloat(plusMatch[1]);
      }
      // '-={n}' — n ms before cursor
      const minusMatch = at.match(/^-=(\d+(?:\.\d+)?)$/);
      if (minusMatch && minusMatch[1]) {
        return Math.max(0, cursor - parseFloat(minusMatch[1]));
      }
      // '<+={n}' — n ms after previous start
      const ltPlusMatch = at.match(/^<\+=(\d+(?:\.\d+)?)$/);
      if (ltPlusMatch && ltPlusMatch[1]) {
        const prev = entries[entries.length - 1];
        return (prev ? prev.startTime : 0) + parseFloat(ltPlusMatch[1]);
      }
    }
    return cursor;
  }

  const instance: TimelineInstance = {
    add(target, keyframes, options) {
      const springConfig = resolveSpringPreset(options?.spring);
      const duration =
        options?.duration ??
        (options?.spring !== undefined
          ? deriveSpringDuration(springConfig)
          : 350);

      const totalDelay = options?.delay ?? 0;
      const stagger = options?.stagger ?? 0;

      // Estimate max element count for stagger
      let elementCount = 1;
      try {
        const els = resolveTargets(target);
        elementCount = Math.max(els.length, 1);
      } catch {
        // SSR or unavailable
      }

      const maxDuration = duration + totalDelay + stagger * (elementCount - 1);
      const startTime = resolveAt(options?.at as TimelinePosition | undefined, maxDuration);

      entries.push({
        target,
        keyframes,
        options: {
          ...options,
          delay: (options?.delay ?? 0) + startTime,
        },
        startTime,
        duration: maxDuration,
      });

      cursor = startTime + maxDuration;
      return instance;
    },

    addDelay(ms, at) {
      const startTime = resolveAt(at, ms);
      cursor = startTime + ms;
      return instance;
    },

    play() {
      const handles = entries.map((entry) =>
        animate(entry.target, entry.keyframes, entry.options)
      );

      const totalDuration = entries.reduce(
        (max, e) => Math.max(max, e.startTime + e.duration),
        0
      );

      let resolveFinished!: () => void;
      const finishedPromise = new Promise<void>((res) => { resolveFinished = res; });

      Promise.all(handles.map((h) => h.finished)).then(() => resolveFinished());

      const handle: TimelineHandle = {
        play() {
          handles.forEach((h) => h.play());
          return handle;
        },
        pause() {
          handles.forEach((h) => h.pause());
          return handle;
        },
        cancel() {
          handles.forEach((h) => h.cancel());
          resolveFinished();
          return handle;
        },
        seek(time: number) {
          handles.forEach((h) => {
            h.currentTime = time;
          });
          return handle;
        },
        get totalDuration() {
          return totalDuration;
        },
        finished: finishedPromise,
      };

      return handle;
    },
  };

  return instance;
}
