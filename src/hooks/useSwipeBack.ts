import { useEffect } from 'react';

// 80px minimum horizontal travel distinguishes a deliberate back swipe from
// an accidental nudge or tap.
const MIN_HORIZONTAL_DISTANCE = 80;

// 500ms maximum duration keeps slow drags (e.g. scrolling with a side-drag)
// from triggering navigation.
const MAX_DURATION_MS = 500;

/**
 * Attaches pointer-event listeners to `document` and calls `onBack` whenever
 * the user performs a left-to-right horizontal swipe (≥80 px, <500 ms,
 * horizontally dominant). Works with touch, mouse, and pen via the Pointer
 * Events API. Cleans up all listeners on unmount.
 */
export function useSwipeBack(onBack: () => void): void {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let active = false;
    let currentX = 0;
    let currentY = 0;

    function onPointerDown(e: PointerEvent) {
      startX = e.clientX;
      startY = e.clientY;
      currentX = e.clientX;
      currentY = e.clientY;
      startTime = Date.now();
      active = true;
    }

    function onPointerMove(e: PointerEvent) {
      if (!active) return;
      currentX = e.clientX;
      currentY = e.clientY;
    }

    function onPointerUp() {
      if (!active) return;
      active = false;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const duration = Date.now() - startTime;
      // Reject slow gestures (likely scrolling, not a navigation flick).
      if (duration >= MAX_DURATION_MS) return;
      // Reject vertically-dominant gestures so the scroll engine isn't disrupted.
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      // Reject right-to-left and too-short movements.
      if (deltaX < MIN_HORIZONTAL_DISTANCE) return;
      onBack();
    }

    function onPointerCancel() {
      // Reset state when the pointer is cancelled (e.g. stylus leaves screen).
      active = false;
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [onBack]);
}
