import type { MorphOptions } from '../types.js';
import { animate } from '../core/animate.js';

/**
 * Automatically observes an element's size changes (e.g. streaming AI text, dynamic cards, accordions)
 * and smoothly transitions height changes using WAAPI without blocking the main layout thread.
 *
 * @param container The HTMLElement whose height changes should be smoothly morphed.
 * @param options Optional configuration for spring preset, duration, or resize callback.
 * @returns Teardown function that disconnects the observer and cancels active transitions.
 *
 * @example
 * ```ts
 * const cleanup = autoMorph(document.querySelector('.ai-response-box'), {
 *   spring: 'smooth'
 * });
 *
 * // When finished or unmounted:
 * cleanup();
 * ```
 */
export function autoMorph(
  container: HTMLElement,
  options?: MorphOptions
): () => void {
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  // Ensure container clips during height interpolation
  const originalOverflow = container.style.overflow;
  if (!container.style.overflow || container.style.overflow === 'visible') {
    container.style.overflow = 'hidden';
  }

  let previousHeight = container.getBoundingClientRect().height;
  let activeAnimationHandle: ReturnType<typeof animate> | null = null;
  let isDisposed = false;

  const observer = new ResizeObserver((entries) => {
    if (isDisposed) return;

    for (const entry of entries) {
      if (entry.target !== container) continue;

      options?.onResize?.(entry);

      const newHeight = entry.contentRect.height;

      // If change is negligible, ignore
      if (Math.abs(newHeight - previousHeight) < 1) {
        continue;
      }

      // If an animation is already running, cancel it so we seamlessly retarget
      if (activeAnimationHandle) {
        activeAnimationHandle.cancel();
        activeAnimationHandle = null;
      }

      const fromH = previousHeight;
      const toH = newHeight;
      previousHeight = newHeight;

      activeAnimationHandle = animate(
        container,
        {
          height: [`${fromH}px`, `${toH}px`],
        },
        {
          spring: options?.spring ?? 'smooth',
          duration: options?.duration,
          fill: 'forwards',
          onFinish: () => {
            // Restore container height to auto so it remains fluid
            if (!isDisposed) {
              container.style.height = '';
            }
          },
        }
      );
    }
  });

  observer.observe(container);

  // Return unsubscribe/cleanup function
  return () => {
    isDisposed = true;
    observer.disconnect();
    if (activeAnimationHandle) {
      activeAnimationHandle.cancel();
      activeAnimationHandle = null;
    }
    container.style.overflow = originalOverflow;
    container.style.height = '';
  };
}
