const REM_PX = 16; // CSS rem baseline — browsers default to 16px
const LINE_HEIGHT_RATIO = 2; // matches ReaderView.module.css line-height: 2
const FRAME_MS = 1000 / 60; // 60fps frame budget ≈ 16.67ms

/**
 * Convert a per-line scroll interval (in ms) and the current text size
 * (in rem) into the px-per-frame value the engine consumes.
 *
 * One "line" in this app means one line of ayah text — its height is
 * textSizeRem * rem-px * line-height-ratio. The engine advances scrollY
 * by `pxPerFrame` each frame; over `intervalMs` it should advance one
 * full line height. So pxPerFrame = lineHeight / framesPerInterval =
 * (textSizeRem * 16 * 2) / (intervalMs / 16.67).
 */
export function intervalMsToPxPerFrame(
  intervalMs: number,
  textSizeRem: number,
): number {
  const lineHeightPx = textSizeRem * REM_PX * LINE_HEIGHT_RATIO;
  const framesPerInterval = intervalMs / FRAME_MS;
  return lineHeightPx / framesPerInterval;
}
