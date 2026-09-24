/**
 * @module scramble
 * ScrambleText — AI/terminal decoder animation.
 * Characters cycle through random chars before revealing the real text.
 * Uses rAF for timing control (needed for per-frame char randomisation),
 * but the actual style updates go through WAAPI opacity/filter animations.
 */

const CHARSET_DEFAULT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';
const CHARSET_HEX = '0123456789ABCDEF';
const CHARSET_BINARY = '01';
const CHARSET_KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

export type ScrambleCharset = 'default' | 'hex' | 'binary' | 'katakana' | string;

export interface ScrambleOptions {
  /**
   * Character pool for scramble effect.
   * @default 'default' (A-Z, a-z, 0-9, symbols)
   */
  charset?: ScrambleCharset;
  /**
   * Duration of the full scramble reveal in milliseconds.
   * @default 1200
   */
  duration?: number;
  /**
   * Delay before animation starts in milliseconds.
   * @default 0
   */
  delay?: number;
  /**
   * Speed of character changes per second per character.
   * Higher = more frantic; lower = slower decode.
   * @default 20
   */
  fps?: number;
  /**
   * Reveal direction: left-to-right or right-to-left or random.
   * @default 'ltr'
   */
  direction?: 'ltr' | 'rtl' | 'random';
  /**
   * Callback when the scramble completes.
   */
  onComplete?: () => void;
}

export interface ScrambleHandle {
  /** Cancel the scramble and show the final text immediately */
  finish(): void;
  /** Cancel and clear */
  cancel(): void;
  /** The promise that resolves when done */
  readonly finished: Promise<void>;
}

function resolveCharset(charset: ScrambleCharset = 'default'): string {
  switch (charset) {
    case 'default': return CHARSET_DEFAULT;
    case 'hex': return CHARSET_HEX;
    case 'binary': return CHARSET_BINARY;
    case 'katakana': return CHARSET_KATAKANA;
    default: return charset;
  }
}

function randChar(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)] ?? chars[0] ?? '?';
}

/**
 * Scramble-reveals text in an element with a hacker-terminal decode effect.
 * The element must already contain the target text.
 *
 * @example
 * ```ts
 * const h = scrambleText(document.querySelector('h1'), {
 *   charset: 'katakana',
 *   duration: 1500,
 *   direction: 'ltr'
 * });
 * await h.finished;
 * ```
 */
export function scrambleText(element: HTMLElement, options?: ScrambleOptions): ScrambleHandle {
  const targetText = element.textContent ?? '';
  const chars = resolveCharset(options?.charset);
  const duration = options?.duration ?? 1200;
  const delay = options?.delay ?? 0;
  const fps = options?.fps ?? 20;
  const direction = options?.direction ?? 'ltr';
  const frameInterval = 1000 / fps;

  const len = targetText.length;

  // Resolve reveal order
  let revealOrder: number[];
  if (direction === 'rtl') {
    revealOrder = Array.from({ length: len }, (_, i) => len - 1 - i);
  } else if (direction === 'random') {
    revealOrder = Array.from({ length: len }, (_, i) => i).sort(() => Math.random() - 0.5);
  } else {
    revealOrder = Array.from({ length: len }, (_, i) => i);
  }

  // Build per-char reveal timestamps
  // Character i is revealed at: delay + (revealOrder.indexOf(i) / len) * duration
  const revealAt = new Array<number>(len);
  for (let i = 0; i < len; i++) {
    const orderIndex = revealOrder.indexOf(i);
    revealAt[i] = delay + (orderIndex / Math.max(len - 1, 1)) * duration * 0.85;
  }

  let rafId: number | null = null;
  let lastFrameTime = 0;
  let cancelled = false;
  let startTime: number | null = null;

  let resolveFinished!: () => void;
  const finishedPromise = new Promise<void>((res) => { resolveFinished = res; });

  function renderFrame(now: number) {
    if (cancelled) return;

    if (startTime === null) startTime = now;
    const elapsed = now - startTime;

    if (elapsed - lastFrameTime < frameInterval) {
      rafId = requestAnimationFrame(renderFrame);
      return;
    }
    lastFrameTime = elapsed;

    let output = '';
    let allDone = true;

    for (let i = 0; i < len; i++) {
      const ch = targetText[i] ?? '';
      if (!ch) continue;

      if (/\s/.test(ch)) {
        output += ch;
        continue;
      }

      if (elapsed >= (revealAt[i] ?? 0)) {
        output += ch;
      } else {
        output += randChar(chars);
        allDone = false;
      }
    }

    element.textContent = output;

    if (allDone) {
      element.textContent = targetText;
      options?.onComplete?.();
      resolveFinished();
    } else {
      rafId = requestAnimationFrame(renderFrame);
    }
  }

  if (delay > 0) {
    const timer = setTimeout(() => {
      if (!cancelled) rafId = requestAnimationFrame(renderFrame);
    }, delay);
    // Override the cancel to also clear the timer
    const origCancel = () => {
      cancelled = true;
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      element.textContent = targetText;
      resolveFinished();
    };
    return {
      finish() {
        cancelled = true;
        clearTimeout(timer);
        if (rafId !== null) cancelAnimationFrame(rafId);
        element.textContent = targetText;
        resolveFinished();
      },
      cancel: origCancel,
      finished: finishedPromise,
    };
  }

  rafId = requestAnimationFrame(renderFrame);

  return {
    finish() {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      element.textContent = targetText;
      resolveFinished();
    },
    cancel() {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      element.textContent = '';
      resolveFinished();
    },
    finished: finishedPromise,
  };
}
