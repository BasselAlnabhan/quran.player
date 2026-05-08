import { useEffect, useId } from 'react';
import { useScrollEngine } from '@/hooks/useScrollEngine';
import styles from './ScrollControls.module.css';

export default function ScrollControls() {
  const { isRunning, isReducedMotion, isOptedIn, speed, start, stop, toggle, setSpeed, enableAutoScroll } =
    useScrollEngine();

  const sliderId = useId();
  const reducedMotionDescId = useId();

  // Document-level spacebar handler so pause/resume works without focus on the button.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      // Don't intercept space when the user is typing in a form field.
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      // Prevent the browser's default page-scroll behavior when we handle it.
      e.preventDefault();
      toggle();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggle]);

  const showReducedMotionNotice = isReducedMotion && !isOptedIn;

  if (showReducedMotionNotice) {
    return (
      <div className={styles.controls} aria-label="Auto-scroll controls">
        <div className={styles.reducedMotionNotice}>
          <p className={styles.reducedMotionText} id={reducedMotionDescId}>
            Auto-scroll is off because your device prefers reduced motion.
          </p>
          <button
            type="button"
            className={styles.enableButton}
            onClick={enableAutoScroll}
            aria-describedby={reducedMotionDescId}
          >
            Enable auto-scroll
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.controls} aria-label="Auto-scroll controls">
      <button
        type="button"
        className={styles.playButton}
        aria-label={isRunning ? 'Pause auto-scroll' : 'Start auto-scroll'}
        onClick={isRunning ? stop : start}
      >
        {isRunning ? 'Pause' : 'Play'}
      </button>

      <label className={styles.sliderLabel} htmlFor={sliderId}>
        Scroll speed
        <input
          id={sliderId}
          type="range"
          className={styles.slider}
          min="0"
          max="3"
          step="0.25"
          value={speed}
          onChange={(e) => {
            setSpeed(Number(e.target.value));
          }}
        />
      </label>
    </div>
  );
}
