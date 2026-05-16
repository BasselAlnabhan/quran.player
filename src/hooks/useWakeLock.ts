import { useEffect } from 'react';

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (!('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire(): Promise<void> {
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await s.release();
          return;
        }
        sentinel = s;
      } catch {
        // request() rejects if the browser declines (no user gesture,
        // low battery, permission denied, etc.). Wake lock is purely a
        // UX nicety, so silently swallow the rejection.
      }
    }

    function onVisibilityChange(): void {
      // Browser auto-releases the lock when the page is hidden. Re-acquire
      // when the page becomes visible again so reading resumes with the
      // screen-on guarantee intact.
      if (document.visibilityState === 'visible' && sentinel === null && !cancelled) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel) {
        void sentinel.release();
        sentinel = null;
      }
    };
  }, [active]);
}
