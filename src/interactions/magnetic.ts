/**
 * @module magnetic
 * Magnetic hover interaction — elements spring-attract toward the cursor.
 * Uses velocity injection to pass pointer momentum into the spring physics.
 *
 * @example
 * ```ts
 * const cleanup = magnetic(document.querySelector('.btn'), {
 *   strength: 0.4,
 *   spring: 'snappy',
 * });
 * ```
 */

import { animate } from '../core/animate.js';
import type { SpringConfig, PresetName } from '../types.js';

export interface MagneticOptions {
  /**
   * How strongly the element is attracted (0–1).
   * 0.5 = element moves 50% of the way toward the cursor.
   * @default 0.35
   */
  strength?: number;
  /**
   * Spring preset for the attraction and release motions.
   * @default 'snappy'
   */
  spring?: SpringConfig | PresetName;
  /**
   * Area radius (in px) around the element that triggers the effect.
   * If undefined, uses the element's bounding box.
   */
  radius?: number;
  /**
   * Whether to also scale the element slightly on hover.
   * @default true
   */
  scaleOnHover?: boolean;
  /**
   * Scale amount on hover.
   * @default 1.05
   */
  scale?: number;
}

/**
 * Attaches magnetic cursor behavior to an element.
 * The element gently springs toward the cursor position on hover.
 * Returns a cleanup function.
 */
export function magnetic(element: HTMLElement, options?: MagneticOptions): () => void {
  if (typeof window === 'undefined') return () => {};

  const strength = options?.strength ?? 0.35;
  const spring = options?.spring ?? 'snappy';
  const scaleOnHover = options?.scaleOnHover ?? true;
  const scale = options?.scale ?? 1.05;

  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;

  function onPointerMove(e: PointerEvent): void {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    // Check radius
    if (options?.radius !== undefined) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > options.radius) return;
    }

    // Velocity injection: compute pointer velocity for spring
    const now = performance.now();
    const dt = Math.max(now - lastTime, 1);
    const vx = (e.clientX - lastX) / dt;
    const vy = (e.clientY - lastY) / dt;

    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = now;

    const targetX = dx * strength;
    const targetY = dy * strength;

    animate(
      element,
      { x: targetX, y: targetY },
      {
        spring:
          typeof spring === 'object'
            ? { ...spring, velocity: Math.sqrt(vx * vx + vy * vy) * 10 }
            : spring,
      }
    );
  }

  function onPointerEnter(): void {
    if (scaleOnHover) {
      animate(element, { scale }, { spring });
    }
  }

  function onPointerLeave(): void {
    animate(element, { x: 0, y: 0, scale: 1 }, { spring });
  }

  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerenter', onPointerEnter);
  element.addEventListener('pointerleave', onPointerLeave);

  return () => {
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerenter', onPointerEnter);
    element.removeEventListener('pointerleave', onPointerLeave);
    // Reset position
    animate(element, { x: 0, y: 0, scale: 1 }, { spring });
  };
}
