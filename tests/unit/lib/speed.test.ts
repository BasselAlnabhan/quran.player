import { describe, expect, it } from 'vitest';
import { intervalMsToPxPerFrame } from '@/lib/speed';

// FRAME_MS ≈ 16.6667ms (1000/60). framesPerInterval = intervalMs / FRAME_MS.
// lineHeightPx = textSizeRem * 16 * LINE_HEIGHT_RATIO (=1.8). pxPerFrame = lineHeightPx / framesPerInterval.

describe('intervalMsToPxPerFrame', () => {
  it('returns approximately 0.36 for default settings (2000ms, 1.5rem)', () => {
    // (1.5 * 16 * 1.8) / (2000 / 16.6667) ≈ 43.2 / 120 = 0.36
    expect(intervalMsToPxPerFrame(2000, 1.5)).toBeCloseTo(0.36, 2);
  });

  it('returns approximately 0.72 when interval is halved to 1000ms (1.5rem)', () => {
    // Half interval → twice as many pixels per frame → 0.72
    expect(intervalMsToPxPerFrame(1000, 1.5)).toBeCloseTo(0.72, 2);
  });

  it('returns approximately 0.72 when text size is doubled to 3.0rem (2000ms)', () => {
    // Double font → double line height → double pxPerFrame → 0.72
    expect(intervalMsToPxPerFrame(2000, 3.0)).toBeCloseTo(0.72, 2);
  });

  it('is exactly linear in textSizeRem — doubling size doubles pxPerFrame', () => {
    const a = intervalMsToPxPerFrame(2000, 1.0);
    const b = intervalMsToPxPerFrame(2000, 2.0);
    expect(b / a).toBeCloseTo(2, 10);
  });

  it('is exactly inversely linear in intervalMs — halving interval doubles pxPerFrame', () => {
    const a = intervalMsToPxPerFrame(4000, 1.5);
    const b = intervalMsToPxPerFrame(2000, 1.5);
    expect(b / a).toBeCloseTo(2, 10);
  });

  it('returns a positive value for minimum bounds (400ms, 1.0rem)', () => {
    const result = intervalMsToPxPerFrame(400, 1.0);
    expect(result).toBeGreaterThan(0);
  });

  it('returns a smaller value for the slowest speed (10000ms, 1.5rem)', () => {
    const slow = intervalMsToPxPerFrame(10000, 1.5);
    const fast = intervalMsToPxPerFrame(400, 1.5);
    expect(slow).toBeLessThan(fast);
  });

  it('returns approximately 1.8 for fastest speed at default text size (400ms, 1.5rem)', () => {
    // (1.5 * 16 * 1.8) / (400 / 16.6667) ≈ 43.2 / 24 = 1.8
    expect(intervalMsToPxPerFrame(400, 1.5)).toBeCloseTo(1.8, 2);
  });
});
