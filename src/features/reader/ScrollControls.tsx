import { useEffect, useId } from 'react';
import { useScrollEngine } from '@/hooks/useScrollEngine';
import styles from './ScrollControls.module.css';

type Props = {
  pxPerFrame: number;
};

export default function ScrollControls({ pxPerFrame }: Props) {
  const { isRunning, isReducedMotion, isOptedIn, start, stop, toggle, setSpeed, enableAutoScroll } =
    useScrollEngine();

  // useId ensures collision-free IDs if multiple ScrollControls instances ever render.
  const reducedMotionDescId = useId();

  // Forward the computed pxPerFrame from App into the engine whenever it changes.
  // This keeps speed control in settings without the engine knowing about intervals.
  useEffect(() => {
    setSpeed(pxPerFrame);
  }, [pxPerFrame, setSpeed]);

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
      <div role="group" className={styles.controls} aria-label="Auto-scroll controls">
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
    <div role="group" className={styles.controls} aria-label="Auto-scroll controls">
      <button
        type="button"
        className={styles.playButton}
        aria-label={isRunning ? 'Stop auto-scroll' : 'Start auto-scroll'}
        onClick={isRunning ? stop : start}
      >
        {/* aria-hidden: the button's aria-label already announces the action */}
        <span aria-hidden="true" className={styles.playIcon}>
          {isRunning ? '⏹' : '▶'}
        </span>
      </button>
    </div>
  );
}
