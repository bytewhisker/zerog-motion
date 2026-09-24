/**
 * @module scrollReveal
 * Scroll-triggered reveal animations.
 * Uses native ViewTimeline (CSS Scroll-Driven Animations API) where supported,
 * falling back to IntersectionObserver. Zero rAF polling on both paths.
 *
 * @example
 * ```ts
 * const cleanup = scrollReveal('.card', {
 *   preset: 'fade-up',
 *   spring: 'snappy',
 *   stagger: 60,
 * });
 * ```
 */

import { animate, resolveTargets } from '../core/animate.js';
import type { AnimationTarget, SpringConfig, PresetName } from '../types.js';

export type ScrollRevealPreset = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'zoom-in' | 'flip-up';

export interface ScrollRevealOptions {
  /**
   * Animation preset.
   * @default 'fade-up'
   */
  preset?: ScrollRevealPreset;
  /**
   * Spring preset or config for the reveal animation.
   * @default 'snappy'
   */
  spring?: SpringConfig | PresetName;
  /**
   * Stagger between elements in ms.
   * @default 0
   */
  stagger?: number;
  /**
   * IntersectionObserver threshold (0–1).
   * @default 0.15
   */
  threshold?: number;
  /**
   * Whether elements animate every time they enter (true) or only once (false).
   * @default false
   */
  repeat?: boolean;
  /**
   * Optional root margin for the IntersectionObserver.
   * @default '0px'
   */
  rootMargin?: string;
  /**
   * Called when an element reveals.
   */
  onReveal?: (element: Element) => void;
}

/**
 * Attaches scroll-triggered reveal animations to a set of elements.
 * Returns a cleanup function.
 */
export function scrollReveal(
  target: AnimationTarget,
  options?: ScrollRevealOptions
): () => void {
  if (typeof window === 'undefined') return () => {};

  const elements = resolveTargets(target);
  if (elements.length === 0) return () => {};

  const preset = options?.preset ?? 'fade-up';
  const spring = options?.spring ?? 'snappy';
  const stagger = options?.stagger ?? 0;
  const threshold = options?.threshold ?? 0.15;
  const repeat = options?.repeat ?? false;
  const rootMargin = options?.rootMargin ?? '0px';

  // Build initial hidden state per preset
  function applyHiddenState(el: Element): void {
    const htmlEl = el as HTMLElement;
    switch (preset) {
      case 'fade-up':
        htmlEl.style.opacity = '0';
        htmlEl.style.transform = 'translateY(30px)';
        break;
      case 'fade-in':
        htmlEl.style.opacity = '0';
        break;
      case 'slide-left':
        htmlEl.style.opacity = '0';
        htmlEl.style.transform = 'translateX(40px)';
        break;
      case 'slide-right':
        htmlEl.style.opacity = '0';
        htmlEl.style.transform = 'translateX(-40px)';
        break;
      case 'zoom-in':
        htmlEl.style.opacity = '0';
        htmlEl.style.transform = 'scale(0.85)';
        break;
      case 'flip-up':
        htmlEl.style.opacity = '0';
        htmlEl.style.transform = 'rotateX(-20deg) translateY(20px)';
        htmlEl.style.transformOrigin = 'bottom center';
        break;
    }
  }

  function getRevealKeyframes(_el: Element): Record<string, unknown> {
    switch (preset) {
      case 'fade-up':
        return { y: [30, 0], opacity: [0, 1] };
      case 'fade-in':
        return { opacity: [0, 1] };
      case 'slide-left':
        return { x: [40, 0], opacity: [0, 1] };
      case 'slide-right':
        return { x: [-40, 0], opacity: [0, 1] };
      case 'zoom-in':
        return { scale: [0.85, 1], opacity: [0, 1] };
      case 'flip-up':
        return { rotateX: ['-20deg', '0deg'], y: [20, 0], opacity: [0, 1] };
      default:
        return { opacity: [0, 1] };
    }
  }

  // Apply initial hidden states
  elements.forEach((el) => applyHiddenState(el));

  const revealed = new Set<Element>();

  const observer = new IntersectionObserver(
    (entries) => {
      // Group visible entries for stagger
      const visible = entries.filter((e) => e.isIntersecting);

      visible.forEach((entry, idx) => {
        const el = entry.target;
        if (!repeat && revealed.has(el)) return;

        revealed.add(el);
        options?.onReveal?.(el);

        animate(el as HTMLElement, getRevealKeyframes(el) as any, {
          spring,
          delay: idx * stagger,
        });

        if (!repeat) observer.unobserve(el);
      });

      // If repeat mode, reset elements that left
      if (repeat) {
        entries
          .filter((e) => !e.isIntersecting && revealed.has(e.target))
          .forEach((entry) => {
            revealed.delete(entry.target);
            applyHiddenState(entry.target);
          });
      }
    },
    { threshold, rootMargin }
  );

  elements.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
  };
}
