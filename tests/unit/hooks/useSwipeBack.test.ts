import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSwipeBack } from '@/hooks/useSwipeBack';

// jsdom does not implement PointerEvent, so fireEvent.pointerDown loses
// clientX/clientY (they fall back to window.Event which ignores them).
// Polyfill with MouseEvent so the hook receives correct coordinates.
// This must be set up before each test because vitest resets the environment.
beforeEach(() => {
  // jsdom does not ship PointerEvent; polyfill it so dispatchEvent with
  // PointerEvent instances works and clientX/clientY are preserved.
  if (!window.PointerEvent) {
    window.PointerEvent = class PointerEvent extends MouseEvent {
      constructor(type: string, init?: MouseEventInit) {
        super(type, init);
      }
    } as unknown as typeof window.PointerEvent;
  }
});

// ---------------------------------------------------------------------------
// Per-test hook handle — always unmounted in afterEach so document listeners
// never bleed into the next test, even if the test assertion throws.
// ---------------------------------------------------------------------------

let unmountCurrent: (() => void) | null = null;

afterEach(() => {
  if (unmountCurrent !== null) {
    unmountCurrent();
    unmountCurrent = null;
  }
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountHook(onBack: () => void): void {
  const result = renderHook(() => useSwipeBack(onBack));
  unmountCurrent = result.unmount;
}

/**
 * Simulates a pointer swipe on `document`. All events fire synchronously in
 * the same JS tick, so the hook sees a near-zero duration — well under the
 * 500ms MAX_DURATION_MS constant — without any timer mocking.
 *
 * Dispatches PointerEvent (polyfilled as MouseEvent in jsdom) so that
 * clientX and clientY are correctly passed to the hook's handlers.
 */
function dispatchPointerEvent(type: string, init: MouseEventInit): void {
  document.dispatchEvent(new window.PointerEvent(type, { bubbles: true, ...init }));
}

function simulateSwipe(opts: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}): void {
  const { startX, startY, endX, endY } = opts;
  dispatchPointerEvent('pointerdown', { clientX: startX, clientY: startY });
  dispatchPointerEvent('pointermove', { clientX: endX, clientY: endY });
  dispatchPointerEvent('pointerup', {});
}

// ---------------------------------------------------------------------------
// Triggering onBack
// ---------------------------------------------------------------------------

describe('useSwipeBack — valid back swipe', () => {
  it('calls onBack for a left-to-right swipe ≥80px, horizontally dominant, and <500ms', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    // 110px right, 5px down — fast (synchronous ≈ 0ms), clearly horizontal
    simulateSwipe({ startX: 10, startY: 100, endX: 120, endY: 105 });

    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Rejection criteria
// ---------------------------------------------------------------------------

describe('useSwipeBack — vertical-dominant gesture', () => {
  it('does not call onBack when |deltaY| > |deltaX|', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    // 50px right, 200px down — clearly vertical
    simulateSwipe({ startX: 10, startY: 0, endX: 60, endY: 200 });

    expect(onBack).not.toHaveBeenCalled();
  });
});

describe('useSwipeBack — too slow', () => {
  it('does not call onBack when the gesture takes ≥500ms', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    // Simulate a slow gesture by controlling what Date.now() returns.
    // We use a mutable "current time" that we advance between events, rather
    // than a call counter, because the MouseEvent polyfill constructor also
    // calls Date.now() internally for the event timestamp.
    let fakeNow = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);

    // Fire pointerdown — hook captures startTime = 1_000_000.
    dispatchPointerEvent('pointerdown', { clientX: 10, clientY: 100 });

    // Advance fake clock past the 500ms threshold before pointerup.
    fakeNow += 600;

    // 200px right — would normally pass, but duration (600ms) exceeds limit
    dispatchPointerEvent('pointermove', { clientX: 210, clientY: 105 });
    dispatchPointerEvent('pointerup', {});

    expect(onBack).not.toHaveBeenCalled();
  });
});

describe('useSwipeBack — right-to-left swipe', () => {
  it('does not call onBack for a negative deltaX', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    // End is to the LEFT of start — RTL swipe, not a back gesture
    simulateSwipe({ startX: 200, startY: 100, endX: 50, endY: 105 });

    expect(onBack).not.toHaveBeenCalled();
  });
});

describe('useSwipeBack — too short', () => {
  it('does not call onBack when deltaX < 80px', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    // 79px right — just under the 80px threshold
    simulateSwipe({ startX: 10, startY: 100, endX: 89, endY: 105 });

    expect(onBack).not.toHaveBeenCalled();
  });

  it('calls onBack when deltaX is exactly 80px', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    // Exactly 80px right — on the threshold, should trigger
    simulateSwipe({ startX: 10, startY: 100, endX: 90, endY: 105 });

    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Cleanup on unmount
// ---------------------------------------------------------------------------

describe('useSwipeBack — cleanup', () => {
  it('does not call onBack after the hook is unmounted', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    // Unmount explicitly so afterEach skips the second unmount.
    unmountCurrent!();
    unmountCurrent = null;

    // Swipe fired after unmount — listeners should have been removed.
    simulateSwipe({ startX: 10, startY: 100, endX: 120, endY: 105 });

    expect(onBack).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// pointercancel resets state
// ---------------------------------------------------------------------------

describe('useSwipeBack — pointercancel', () => {
  it('does not call onBack when the gesture ends with pointercancel instead of pointerup', () => {
    const onBack = vi.fn();
    mountHook(onBack);

    dispatchPointerEvent('pointerdown', { clientX: 10, clientY: 100 });
    dispatchPointerEvent('pointermove', { clientX: 120, clientY: 105 });
    // Cancel instead of up — active flag resets, no onBack
    dispatchPointerEvent('pointercancel', {});

    expect(onBack).not.toHaveBeenCalled();
  });
});
