/**
 * @module animateText
 * High-level text animation API with cinematic presets.
 * All animations are compositor-native via WAAPI.
 *
 * Presets:
 * - mask-up    : Words/chars slide up through a clip mask (Linear/Apple look)
 * - blur-in    : Characters fade in from blur (AI generation aesthetic)
 * - flip-3d    : Each character rotates on X axis (slot-machine)
 * - wave       : Sine-wave Y offset across chars
 * - glitch     : Rapid position/color flicker (cyberpunk)
 * - typewriter : Characters appear one by one with spring pacing
 * - rise       : Lines slide up from below (editorial)
 * - fade-up    : Simple fade + translate (utility)
 */

import { splitText } from './split.js';
import { animate } from '../core/animate.js';
import type { SpringConfig, PresetName } from '../types.js';

export type TextPreset =
  | 'mask-up'
  | 'blur-in'
  | 'flip-3d'
  | 'wave'
  | 'glitch'
  | 'typewriter'
  | 'rise'
  | 'fade-up';

export interface TextAnimationOptions {
  /**
   * The cinematic preset to use.
   * @default 'fade-up'
   */
  preset?: TextPreset;
  /**
   * Spring physics preset or config.
   * @default 'snappy'
   */
  spring?: SpringConfig | PresetName;
  /**
   * Stagger between each animated unit in milliseconds.
   * @default 40
   */
  stagger?: number;
  /**
   * Delay before the animation starts in milliseconds.
   * @default 0
   */
  delay?: number;
  /**
   * Split unit. Defaults to best choice per preset.
   */
  splitBy?: 'chars' | 'words' | 'lines';
  /**
   * Callback when the full animation finishes.
   */
  onComplete?: () => void;
}

export interface TextAnimationHandle {
  /** Cancel and reset */
  cancel(): void;
  /** Restore original HTML */
  revert(): void;
  /** Resolves when all character animations are done */
  readonly finished: Promise<void>;
}

/**
 * Animates text content with a cinematic preset.
 * All style work is done via compositor-thread WAAPI.
 *
 * @example
 * ```ts
 * await animateText(document.querySelector('h1'), {
 *   preset: 'mask-up',
 *   spring: 'snappy',
 *   stagger: 35,
 * }).finished;
 * ```
 */
export function animateText(
  element: HTMLElement,
  options?: TextAnimationOptions
): TextAnimationHandle {
  const preset = options?.preset ?? 'fade-up';
  const spring = options?.spring ?? 'snappy';
  const stagger = options?.stagger ?? 40;
  const delay = options?.delay ?? 0;

  // Determine split unit based on preset
  const defaultSplitBy: 'chars' | 'words' | 'lines' = (() => {
    switch (preset) {
      case 'mask-up':
      case 'rise':
        return 'lines';
      case 'wave':
      case 'flip-3d':
      case 'glitch':
      case 'blur-in':
      case 'typewriter':
        return 'chars';
      default:
        return 'words';
    }
  })();

  const splitBy = options?.splitBy ?? defaultSplitBy;

  const splitResult = splitText(element, {
    type: splitBy === 'lines' ? 'lines,words' : splitBy === 'words' ? 'words' : 'words,chars',
  });

  const units: HTMLElement[] =
    splitBy === 'lines'
      ? splitResult.lines
      : splitBy === 'words'
      ? splitResult.words
      : splitResult.chars;

  // Apply preset-specific initial styles
  applyInitialStyles(units, preset);

  let cancelled = false;
  let handle: ReturnType<typeof animate> | null = null;

  // Build animation based on preset
  handle = runPreset(units, preset, spring, stagger, delay, () => {
    if (!cancelled) options?.onComplete?.();
  });

  const finished = handle?.finished ?? Promise.resolve();

  return {
    cancel() {
      cancelled = true;
      handle?.cancel();
    },
    revert() {
      cancelled = true;
      handle?.cancel();
      splitResult.revert();
    },
    finished,
  };
}

function applyInitialStyles(units: HTMLElement[], preset: TextPreset): void {
  for (const unit of units) {
    unit.style.display = 'inline-block';

    switch (preset) {
      case 'mask-up':
        unit.style.overflow = 'hidden';
        break;
      case 'flip-3d':
        unit.style.transformOrigin = '50% 50%';
        unit.style.perspective = '400px';
        unit.style.display = 'inline-block';
        break;
      case 'glitch':
        unit.style.position = 'relative';
        break;
    }
  }
}

function runPreset(
  units: HTMLElement[],
  preset: TextPreset,
  spring: SpringConfig | PresetName,
  stagger: number,
  delay: number,
  onComplete?: () => void
): ReturnType<typeof animate> | null {
  if (units.length === 0) {
    onComplete?.();
    return null;
  }

  switch (preset) {
    case 'fade-up':
      return animate(
        units,
        { y: [30, 0], opacity: [0, 1] },
        { spring, stagger, delay, onFinish: onComplete }
      );

    case 'mask-up': {
      // Each unit's child (word/char) slides up within a clip container
      // We animate the inner content spans, not the line wrappers
      const innerSpans = units.flatMap((u) => Array.from(u.children) as HTMLElement[]);
      const targets = innerSpans.length > 0 ? innerSpans : units;

      return animate(
        targets,
        { y: ['110%', '0%'], opacity: [0, 1] },
        { spring, stagger, delay, onFinish: onComplete }
      );
    }

    case 'blur-in':
      return animate(
        units,
        { opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] },
        { spring, stagger, delay, onFinish: onComplete }
      );

    case 'flip-3d':
      return animate(
        units,
        { rotateX: ['-90deg', '0deg'], opacity: [0, 1] },
        { spring, stagger, delay, onFinish: onComplete }
      );

    case 'rise':
      return animate(
        units,
        { y: ['100%', '0%'], opacity: [0, 1] },
        { spring, stagger, delay, onFinish: onComplete }
      );

    case 'wave': {
      // Wave: stagger + sine offset on Y
      if (units.length === 0) return null;
      const waveAmp = 12;
      // We stagger individual chars with sine-based Y offsets baked as CSS
      // We do this by running individual animations per char
      const wavePromises: Promise<void>[] = [];
      units.forEach((unit, i) => {
        const yOffset = Math.sin((i / units.length) * Math.PI * 2) * waveAmp;
        const h = animate(
          unit,
          { y: [yOffset + 20, 0], opacity: [0, 1] },
          { spring, delay: delay + i * stagger }
        );
        wavePromises.push(h.finished);
      });
      // Create a pseudo-handle (the last element's handle drives onFinish)
      const lastHandle = animate(
        units[units.length - 1]!,
        {},
        { delay: delay + (units.length - 1) * stagger, duration: 1, onFinish: onComplete }
      );
      void Promise.all(wavePromises).then(() => onComplete?.());
      return lastHandle;
    }

    case 'typewriter': {
      // Chars appear one by one with a short scale pop
      const h = animate(
        units,
        { scale: [0.5, 1], opacity: [0, 1] },
        { spring: 'bouncy', stagger, delay, onFinish: onComplete }
      );
      return h;
    }

    case 'glitch': {
      // Fast random x/y wobble then snap to 0
      const glitchPromises: Promise<void>[] = [];
      units.forEach((unit, i) => {
        const rx = (Math.random() - 0.5) * 8;
        const ry = (Math.random() - 0.5) * 4;
        const h = animate(
          unit,
          [
            { opacity: 0, transform: `translate(${rx * 2}px, ${ry * 2}px)` },
            { opacity: 1, transform: `translate(${-rx}px, ${-ry}px)` },
            { opacity: 1, transform: `translate(${rx * 0.5}px, 0px)` },
            { opacity: 1, transform: 'translate(0px, 0px)' },
          ],
          { duration: 400, easing: 'ease-out', delay: delay + i * stagger }
        );
        glitchPromises.push(h.finished);
      });
      void Promise.all(glitchPromises).then(() => onComplete?.());
      return null;
    }

    default:
      return animate(
        units,
        { opacity: [0, 1] },
        { spring, stagger, delay, onFinish: onComplete }
      );
  }
}
