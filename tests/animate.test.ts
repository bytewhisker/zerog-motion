import { describe, it, expect, beforeEach, vi } from 'vitest';
import { animate, resolveTargets } from '../src/core/animate.js';

// Setup Mock DOM Element and WAAPI Animation
class MockAnimation {
  public currentTime: number | null = 0;
  public playbackRate: number = 1;
  public play = vi.fn();
  public pause = vi.fn();
  public reverse = vi.fn();
  public cancel = vi.fn(() => {
    this.triggerListeners('cancel');
  });
  public finish = vi.fn(() => {
    this.triggerListeners('finish');
  });

  private listeners: Record<string, Function[]> = {};
  public finished: Promise<void>;
  private resolveFinished!: () => void;

  constructor(public keyframes: any, public options: any) {
    this.finished = new Promise<void>((resolve) => {
      this.resolveFinished = resolve;
    });
  }

  public addEventListener(type: string, cb: Function, _opts?: any) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  public removeEventListener(type: string, cb: Function) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((fn) => fn !== cb);
  }

  private triggerListeners(type: string) {
    const list = this.listeners[type] || [];
    list.forEach((cb) => cb());
    if (type === 'finish' || type === 'cancel') {
      this.resolveFinished();
    }
  }

  // Helper to simulate animation completing
  public simulateFinish() {
    this.triggerListeners('finish');
  }
}

class MockElement {
  public style: Record<string, any> = {};
  public animateCalls: { keyframes: any; options: any; animation: MockAnimation }[] = [];

  public animate(keyframes: any, options: any): MockAnimation {
    const anim = new MockAnimation(keyframes, options);
    this.animateCalls.push({ keyframes, options, animation: anim });
    return anim;
  }

  public getBoundingClientRect() {
    return { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 };
  }
}

describe('Animation Target Resolution (resolveTargets)', () => {
  beforeEach(() => {
    // Expose mock global Element
    (globalThis as any).Element = MockElement;
  });

  it('resolves a single Element target', () => {
    const el = new MockElement() as unknown as Element;
    const resolved = resolveTargets(el);
    expect(resolved).toEqual([el]);
  });

  it('resolves an array of Element targets', () => {
    const el1 = new MockElement() as unknown as Element;
    const el2 = new MockElement() as unknown as Element;
    const resolved = resolveTargets([el1, el2]);
    expect(resolved).toHaveLength(2);
  });

  it('safely queries document.querySelectorAll when string selector is passed', () => {
    const el = new MockElement() as unknown as Element;
    (globalThis as any).document = {
      querySelectorAll: vi.fn().mockReturnValue([el]),
    };

    const resolved = resolveTargets('.card');
    expect(resolved).toEqual([el]);
    expect((globalThis as any).document.querySelectorAll).toHaveBeenCalledWith('.card');
  });

  it('returns empty array when target is invalid or not found', () => {
    const resolved = resolveTargets(null as any);
    expect(resolved).toEqual([]);
  });
});

describe('WAAPI Execution & Keyframe Translation (animate)', () => {
  let element: MockElement;

  beforeEach(() => {
    (globalThis as any).Element = MockElement;
    element = new MockElement();
  });

  it('compiles shorthand transform properties (x, y, scale, rotate) into CSS transform', () => {
    animate(
      element as unknown as Element,
      {
        x: 100,
        y: 50,
        scale: 1.2,
        rotate: 45,
        opacity: 0.8,
      },
      { duration: 300, easing: 'ease-out' }
    );

    expect(element.animateCalls).toHaveLength(1);
    const call = element.animateCalls[0]!;
    const [fromFrame, toFrame] = call.keyframes;

    // Verify 'from' identity values
    expect(fromFrame.transform).toContain('translateX(0px)');
    expect(fromFrame.transform).toContain('translateY(0px)');
    expect(fromFrame.transform).toContain('scale(1)');
    expect(fromFrame.transform).toContain('rotate(0deg)');
    expect(fromFrame.opacity).toBe(1);

    // Verify 'to' values
    expect(toFrame.transform).toContain('translateX(100px)');
    expect(toFrame.transform).toContain('translateY(50px)');
    expect(toFrame.transform).toContain('scale(1.2)');
    expect(toFrame.transform).toContain('rotate(45deg)');
    expect(toFrame.opacity).toBe(0.8);
  });

  it('uses sampled keyframes with linear easing when spring physics is used', () => {
    animate(
      element as unknown as Element,
      { x: [0, 200] },
      { spring: 'snappy' }
    );

    expect(element.animateCalls).toHaveLength(1);
    const call = element.animateCalls[0]!;

    // Spring animations sample multiple keyframe steps
    expect(call.keyframes.length).toBeGreaterThan(10);
    expect(call.options.easing).toBe('linear');
    expect(call.keyframes[0].transform).toContain('translateX(0px)');
    expect(call.keyframes[call.keyframes.length - 1].transform).toContain('translateX(200px)');
  });

  it('applies stagger delay across multiple elements', () => {
    const el1 = new MockElement();
    const el2 = new MockElement();
    const el3 = new MockElement();

    animate(
      [el1, el2, el3] as unknown as Element[],
      { opacity: 1 },
      { duration: 200, stagger: 50, delay: 100 }
    );

    expect(el1.animateCalls[0]!.options.delay).toBe(100);
    expect(el2.animateCalls[0]!.options.delay).toBe(150);
    expect(el3.animateCalls[0]!.options.delay).toBe(200);
  });
});

describe('AnimationHandle Controls & Lifecycle', () => {
  let element: MockElement;

  beforeEach(() => {
    (globalThis as any).Element = MockElement;
    element = new MockElement();
  });

  it('controls playback methods (play, pause, reverse, cancel, finish)', () => {
    const handle = animate(
      element as unknown as Element,
      { opacity: [0, 1] },
      { duration: 400 }
    );

    const animInstance = element.animateCalls[0]!.animation;

    handle.pause();
    expect(animInstance.pause).toHaveBeenCalledTimes(1);

    handle.play();
    expect(animInstance.play).toHaveBeenCalledTimes(1);

    handle.reverse();
    expect(animInstance.reverse).toHaveBeenCalledTimes(1);

    handle.finish();
    expect(animInstance.finish).toHaveBeenCalledTimes(1);

    handle.cancel();
    expect(animInstance.cancel).toHaveBeenCalledTimes(1);
  });

  it('resolves finished promise when animation finishes', async () => {
    const onFinish = vi.fn();
    const handle = animate(
      element as unknown as Element,
      { x: 100 },
      { duration: 200, onFinish }
    );

    const animInstance = element.animateCalls[0]!.animation;

    // Simulate completion
    animInstance.simulateFinish();

    await handle.finished;
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('returns safe no-op handle when target matches no elements', async () => {
    const handle = animate([], { x: 100 });
    expect(handle.elements).toEqual([]);

    // None of these should throw
    handle.play();
    handle.pause();
    handle.reverse();
    handle.cancel();
    handle.finish();

    await expect(handle.finished).resolves.toBeUndefined();
  });
});
