import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoMorph } from '../src/primitives/morph.js';

class MockResizeObserver {
  public static instances: MockResizeObserver[] = [];
  public observedElements: Element[] = [];
  public isDisconnected = false;

  constructor(public callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }

  public observe(target: Element) {
    this.observedElements.push(target);
  }

  public unobserve(target: Element) {
    this.observedElements = this.observedElements.filter((el) => el !== target);
  }

  public disconnect() {
    this.isDisconnected = true;
    this.observedElements = [];
  }

  public trigger(entries: Partial<ResizeObserverEntry>[]) {
    this.callback(entries as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }
}

describe('Layout & Streaming Primitive (autoMorph)', () => {
  let mockContainer: any;

  beforeEach(() => {
    MockResizeObserver.instances = [];
    (globalThis as any).window = {};
    (globalThis as any).ResizeObserver = MockResizeObserver;
    class MockElement {
      public style: Record<string, string> = { overflow: '', height: '' };
      public getBoundingClientRect = () => ({ height: 100, width: 100, top: 0, left: 0, right: 100, bottom: 100 });
      public animate = vi.fn().mockReturnValue({
        play: vi.fn(),
        pause: vi.fn(),
        cancel: vi.fn(),
        finish: vi.fn(),
        addEventListener: vi.fn(),
        finished: Promise.resolve(),
      });
    }

    (globalThis as any).Element = MockElement;
    mockContainer = new MockElement();
  });

  it('attaches ResizeObserver to the target container and sets overflow to hidden', () => {
    const cleanup = autoMorph(mockContainer);

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observerInstance = MockResizeObserver.instances[0]!;
    expect(observerInstance.observedElements).toContain(mockContainer);
    expect(mockContainer.style.overflow).toBe('hidden');

    cleanup();
    expect(observerInstance.isDisconnected).toBe(true);
  });

  it('triggers smooth height transition when height changes', () => {
    const onResize = vi.fn();
    autoMorph(mockContainer, { spring: 'smooth', onResize });

    const observerInstance = MockResizeObserver.instances[0]!;

    // Simulate content growth (e.g. streaming LLM token arrival)
    observerInstance.trigger([
      {
        target: mockContainer,
        contentRect: { height: 250 } as DOMRectReadOnly,
      },
    ]);

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(mockContainer.animate).toHaveBeenCalledTimes(1);
  });

  it('ignores micro-jitter height changes under 1 pixel', () => {
    autoMorph(mockContainer);
    const observerInstance = MockResizeObserver.instances[0]!;

    // Change by only 0.4px
    observerInstance.trigger([
      {
        target: mockContainer,
        contentRect: { height: 100.4 } as DOMRectReadOnly,
      },
    ]);

    expect(mockContainer.animate).not.toHaveBeenCalled();
  });

  it('restores initial styling and disconnects observer on cleanup', () => {
    mockContainer.style.overflow = 'auto';
    const cleanup = autoMorph(mockContainer);
    const observerInstance = MockResizeObserver.instances[0]!;

    cleanup();
    expect(observerInstance.isDisconnected).toBe(true);
    expect(mockContainer.style.overflow).toBe('auto');
  });
});
