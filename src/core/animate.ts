import type {
  AnimationHandle,
  AnimationOptions,
  AnimationTarget,
  PropertyKeyframeDefinition,
} from '../types.js';
import { deriveSpringDuration, sampleSpringProgress } from './spring.js';
import { resolveSpringPreset } from '../presets/index.js';

/**
 * WeakMap tracking active WAAPI Animation instances per DOM Element.
 * Automatically cleans up without memory leaks when DOM nodes unmount.
 */
const activeAnimationsMap = new WeakMap<Element, Set<Animation>>();

/**
 * Default units for transform properties when numeric values are provided.
 */
const TRANSFORM_UNITS: Record<string, string> = {
  x: 'px',
  y: 'px',
  z: 'px',
  rotate: 'deg',
  rotateX: 'deg',
  rotateY: 'deg',
  rotateZ: 'deg',
  skewX: 'deg',
  skewY: 'deg',
};

/**
 * Standard identity values when property starts from rest.
 */
const PROPERTY_DEFAULTS: Record<string, number> = {
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  x: 0,
  y: 0,
  z: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  skewX: 0,
  skewY: 0,
};

/**
 * Checks whether a property key is a transform shorthand.
 */
const TRANSFORM_PROPERTIES = new Set([
  'x',
  'y',
  'z',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
]);

/**
 * Safely resolves target selector, Element, or list of Elements.
 */
export function resolveTargets(target: AnimationTarget): Element[] {
  if (typeof target === 'string') {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll(target));
  }

  if (target instanceof Element) {
    return [target];
  }

  if (Array.isArray(target)) {
    return target.filter((el): el is Element => el instanceof Element);
  }

  if (
    typeof NodeList !== 'undefined' &&
    target instanceof NodeList
  ) {
    return Array.from(target).filter((el): el is Element => el instanceof Element);
  }

  if (
    typeof HTMLCollection !== 'undefined' &&
    target instanceof HTMLCollection
  ) {
    return Array.from(target).filter((el): el is Element => el instanceof Element);
  }

  return [];
}

/**
 * Formats a transform function call (e.g. `translateX(100px)`).
 */
function formatTransformComponent(prop: string, val: number | string): string {
  const unit = typeof val === 'number' ? (TRANSFORM_UNITS[prop] ?? '') : '';
  const strVal = typeof val === 'number' ? `${val}${unit}` : val;

  switch (prop) {
    case 'x':
      return `translateX(${strVal})`;
    case 'y':
      return `translateY(${strVal})`;
    case 'z':
      return `translateZ(${strVal})`;
    case 'scale':
      return `scale(${strVal})`;
    case 'scaleX':
      return `scaleX(${strVal})`;
    case 'scaleY':
      return `scaleY(${strVal})`;
    case 'rotate':
      return `rotate(${strVal})`;
    case 'rotateX':
      return `rotateX(${strVal})`;
    case 'rotateY':
      return `rotateY(${strVal})`;
    case 'rotateZ':
      return `rotateZ(${strVal})`;
    case 'skewX':
      return `skewX(${strVal})`;
    case 'skewY':
      return `skewY(${strVal})`;
    default:
      return `${prop}(${strVal})`;
  }
}

/**
 * Parses numeric value and optional unit from string or number.
 */
function parseNumericValue(val: unknown, fallback: number = 0): { num: number; unit: string } {
  if (typeof val === 'number') {
    return { num: val, unit: '' };
  }
  if (typeof val === 'string') {
    const match = val.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
    if (match && match[1]) {
      return { num: parseFloat(match[1]), unit: match[2] ?? '' };
    }
  }
  return { num: fallback, unit: '' };
}

/**
 * Builds WAAPI keyframes based on spring curve or standard progress.
 */
function compileKeyframes(
  definition: PropertyKeyframeDefinition,
  options?: AnimationOptions
): Keyframe[] {
  // If array of Keyframe objects already passed
  if (Array.isArray(definition)) {
    return definition.map((frame) => {
      const transformParts: string[] = [];
      const result: Keyframe = {};

      for (const [key, val] of Object.entries(frame)) {
        if (TRANSFORM_PROPERTIES.has(key)) {
          transformParts.push(formatTransformComponent(key, val as number | string));
        } else {
          result[key] = val as string | number;
        }
      }

      if (transformParts.length > 0) {
        result.transform = transformParts.join(' ');
      }

      return result;
    });
  }

  // Object format: { x: [0, 100], opacity: [0, 1] } or { x: 100, opacity: 1 }
  const isSpring = Boolean(options?.spring) || (!options?.easing && options?.duration === undefined);
  const springConfig = isSpring ? resolveSpringPreset(options?.spring) : undefined;
  const duration = options?.duration ?? (isSpring ? deriveSpringDuration(springConfig) : 350);

  // Parse start and end for each property
  interface PropRange {
    prop: string;
    isTransform: boolean;
    fromNum: number;
    toNum: number;
    unit: string;
    isNumeric: boolean;
    rawFrom?: unknown;
    rawTo?: unknown;
  }

  const propRanges: PropRange[] = [];

  for (const [key, rawVal] of Object.entries(definition)) {
    if (rawVal === undefined || rawVal === null) continue;

    const defaultValue = PROPERTY_DEFAULTS[key] ?? 0;
    let fromRaw: unknown;
    let toRaw: unknown;

    if (Array.isArray(rawVal)) {
      if (rawVal.length === 1) {
        fromRaw = defaultValue;
        toRaw = rawVal[0];
      } else {
        fromRaw = rawVal[0];
        toRaw = rawVal[rawVal.length - 1];
      }
    } else {
      fromRaw = defaultValue;
      toRaw = rawVal;
    }

    const isTransform = TRANSFORM_PROPERTIES.has(key);
    const parsedFrom = parseNumericValue(fromRaw, defaultValue);
    const parsedTo = parseNumericValue(toRaw, defaultValue);
    const unit = parsedTo.unit || parsedFrom.unit || TRANSFORM_UNITS[key] || '';

    propRanges.push({
      prop: key,
      isTransform,
      fromNum: parsedFrom.num,
      toNum: parsedTo.num,
      unit,
      isNumeric: !isNaN(parsedFrom.num) && !isNaN(parsedTo.num),
      rawFrom: fromRaw,
      rawTo: toRaw,
    });
  }

  if (isSpring) {
    // Generate keyframes along the spring curve
    const sampleCount = Math.max(30, Math.min(60, Math.round(duration / 16)));
    const progressList = sampleSpringProgress(springConfig, duration, sampleCount);

    return progressList.map((progress, index) => {
      const transformParts: string[] = [];
      const frame: Keyframe = {};

      for (const range of propRanges) {
        if (range.isNumeric) {
          const currentVal = range.fromNum + (range.toNum - range.fromNum) * progress;
          const roundedVal = Math.round(currentVal * 10000) / 10000;
          const formatted = `${roundedVal}${range.unit}`;

          if (range.isTransform) {
            transformParts.push(formatTransformComponent(range.prop, formatted));
          } else {
            frame[range.prop] = range.prop === 'opacity' ? roundedVal : formatted;
          }
        } else {
          // Discrete or string properties
          const raw = progress >= 0.5 ? range.rawTo : range.rawFrom;
          if (range.isTransform) {
            transformParts.push(formatTransformComponent(range.prop, raw as string | number));
          } else {
            frame[range.prop] = raw as string | number;
          }
        }
      }

      if (transformParts.length > 0) {
        frame.transform = transformParts.join(' ');
      }

      frame.offset = index / (progressList.length - 1);
      return frame;
    });
  }

  // Non-spring WAAPI keyframes (from -> to)
  const fromFrame: Keyframe = {};
  const toFrame: Keyframe = {};
  const fromTransforms: string[] = [];
  const toTransforms: string[] = [];

  for (const range of propRanges) {
    if (range.isTransform) {
      fromTransforms.push(
        formatTransformComponent(
          range.prop,
          range.isNumeric ? `${range.fromNum}${range.unit}` : (range.rawFrom as string | number)
        )
      );
      toTransforms.push(
        formatTransformComponent(
          range.prop,
          range.isNumeric ? `${range.toNum}${range.unit}` : (range.rawTo as string | number)
        )
      );
    } else {
      fromFrame[range.prop] = range.isNumeric
        ? range.prop === 'opacity'
          ? range.fromNum
          : `${range.fromNum}${range.unit}`
        : (range.rawFrom as string | number);
      toFrame[range.prop] = range.isNumeric
        ? range.prop === 'opacity'
          ? range.toNum
          : `${range.toNum}${range.unit}`
        : (range.rawTo as string | number);
    }
  }

  if (fromTransforms.length > 0) fromFrame.transform = fromTransforms.join(' ');
  if (toTransforms.length > 0) toFrame.transform = toTransforms.join(' ');

  return [fromFrame, toFrame];
}

/**
 * Main animation runner.
 *
 * Runs hardware-accelerated animations using native WAAPI (`element.animate()`).
 *
 * @param target CSS selector string, DOM Element, or array of Elements.
 * @param keyframes Animatable properties or keyframe list.
 * @param options Timing, spring physics, or playback options.
 * @returns AnimationHandle providing unified playback controls and a `.finished` promise.
 */
export function animate(
  target: AnimationTarget,
  keyframes: PropertyKeyframeDefinition,
  options?: AnimationOptions
): AnimationHandle {
  const elements = resolveTargets(target);

  // If no matching elements found, return resolved no-op handle
  if (elements.length === 0) {
    return {
      play: () => {},
      pause: () => {},
      reverse: () => {},
      cancel: () => {},
      finish: () => {},
      currentTime: 0,
      playbackRate: 1,
      finished: Promise.resolve(),
      elements: [],
    };
  }

  const isSpring = Boolean(options?.spring) || (!options?.easing && options?.duration === undefined);
  const springConfig = isSpring ? resolveSpringPreset(options?.spring) : undefined;
  const duration = options?.duration ?? (isSpring ? deriveSpringDuration(springConfig) : 350);
  const compiledKeyframes = compileKeyframes(keyframes, options);

  const animations: Animation[] = [];

  elements.forEach((el, index) => {
    // Clean up or cancel existing active animations on this element
    let activeSet = activeAnimationsMap.get(el);
    if (!activeSet) {
      activeSet = new Set();
      activeAnimationsMap.set(el, activeSet);
    }

    const staggerDelay = (options?.stagger ?? 0) * index;
    const totalDelay = (options?.delay ?? 0) + staggerDelay;

    const keyframeEffectOptions: KeyframeEffectOptions = {
      duration,
      delay: totalDelay,
      endDelay: options?.endDelay ?? 0,
      easing: isSpring ? 'linear' : options?.easing ?? 'ease-out',
      iterations: options?.iterations ?? 1,
      direction: options?.direction ?? 'normal',
      fill: options?.fill ?? 'forwards',
    };

    if (typeof el.animate === 'function') {
      const waapiAnim = el.animate(compiledKeyframes, keyframeEffectOptions);
      activeSet.add(waapiAnim);

      const cleanup = () => {
        activeSet?.delete(waapiAnim);
      };

      waapiAnim.addEventListener('finish', cleanup, { once: true });
      waapiAnim.addEventListener('cancel', cleanup, { once: true });

      animations.push(waapiAnim);
    }
  });

  const finishedPromise = (async () => {
    await Promise.all(
      animations.map((anim) => {
        // Modern WAAPI provides .finished promise
        if (anim.finished) {
          return anim.finished.catch(() => {});
        }
        // Fallback for mock or older environments
        return new Promise<void>((resolve) => {
          anim.addEventListener('finish', () => resolve(), { once: true });
          anim.addEventListener('cancel', () => resolve(), { once: true });
        });
      })
    );
    options?.onFinish?.();
  })();

  const handle: AnimationHandle = {
    play() {
      animations.forEach((a) => a.play());
    },
    pause() {
      animations.forEach((a) => a.pause());
    },
    reverse() {
      animations.forEach((a) => a.reverse());
    },
    cancel() {
      animations.forEach((a) => a.cancel());
      elements.forEach((el) => {
        activeAnimationsMap.get(el)?.clear();
      });
    },
    finish() {
      animations.forEach((a) => a.finish());
    },
    get currentTime(): number | null {
      const time = animations[0]?.currentTime;
      return typeof time === 'number' ? time : null;
    },
    set currentTime(val: number | null) {
      animations.forEach((a) => {
        a.currentTime = val;
      });
    },
    get playbackRate() {
      return animations[0]?.playbackRate ?? 1;
    },
    set playbackRate(val: number) {
      animations.forEach((a) => {
        a.playbackRate = val;
      });
    },
    finished: finishedPromise,
    elements,
  };

  return handle;
}
