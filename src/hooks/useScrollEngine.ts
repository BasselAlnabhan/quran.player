import { useCallback, useEffect, useRef, useState } from 'react';
import { createScrollEngine } from '@/lib/scroll-engine';
import type { ScrollEngine } from '@/lib/scroll-engine';

const DEFAULT_SPEED = 0.5;

export type UseScrollEngineResult = {
  isRunning: boolean;
  isReducedMotion: boolean;
  isOptedIn: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  setSpeed: (n: number) => void;
  enableAutoScroll: () => void;
};

// scrollingElement is the spec-blessed scroll root: documentElement in standards
// mode, body in quirks mode, and on iOS WebKit it sometimes returns body even in
// standards mode for compatibility. Using it avoids the dual-write workaround.
function scrollRoot(): Element {
  return document.scrollingElement ?? document.documentElement;
}

function buildEngine(prefersReducedMotion: boolean): ScrollEngine {
  return createScrollEngine({
    getScrollY: () => scrollRoot().scrollTop,
    // Direct scrollTop assignment avoids iOS Safari silently swallowing
    // window.scrollTo() calls regardless of behavior: 'instant'.
    setScrollY: (y) => {
      scrollRoot().scrollTop = y;
    },
    getContentHeight: () => document.documentElement.scrollHeight,
    getViewportHeight: () => window.innerHeight,
    initialSpeed: DEFAULT_SPEED,
    prefersReducedMotion,
  });
}

export function useScrollEngine(): UseScrollEngineResult {
  // Detect OS reduced-motion preference on mount; update if the OS setting changes.
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isOptedIn, setIsOptedIn] = useState<boolean>(false);

  // UI-facing state that mirrors the engine's internal values.
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // The engine instance lives in a ref — its identity changing is not a React
  // value change and must NOT go into state to avoid infinite re-render loops.
  const engineRef = useRef<ScrollEngine | null>(null);

  // Initialize matchMedia and subscribe to changes on mount.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const initiallyReduced = query.matches;
    setIsReducedMotion(initiallyReduced);

    // Build the first engine instance now that we know the reduced-motion flag.
    const engine = buildEngine(initiallyReduced);
    engineRef.current = engine;

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
      // When the OS setting changes, tear down the current engine and rebuild
      // with the new reduced-motion flag. isOptedIn is reset because the user's
      // OS preference has changed — they should re-opt-in if they still want it.
      engineRef.current?.destroy();
      setIsOptedIn(false);
      setIsRunning(false);
      const newEngine = buildEngine(e.matches);
      engineRef.current = newEngine;
    };

    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.start();
    setIsRunning(engine.isRunning());
  }, []);

  const stop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.stop();
    setIsRunning(false);
  }, []);

  const toggle = useCallback(() => {
    // Reduced-motion users must explicitly opt in before any scroll-start path
    // is reachable — including the document spacebar shortcut. Without this
    // guard, spacebar would call engine.start() and rely on the engine's
    // internal no-op contract, an implicit cross-layer dependency.
    if (isReducedMotion && !isOptedIn) return;
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRunning()) {
      engine.stop();
      setIsRunning(false);
    } else {
      engine.start();
      setIsRunning(engine.isRunning());
    }
  }, [isReducedMotion, isOptedIn]);

  const setSpeed = useCallback((n: number) => {
    engineRef.current?.setSpeed(n);
  }, []);

  const enableAutoScroll = useCallback(() => {
    // Tear down the existing engine (which was built with prefersReducedMotion:
    // true) and recreate with reduced-motion disabled so the user's opt-in is
    // respected.
    engineRef.current?.destroy();
    setIsOptedIn(true);
    setIsRunning(false);
    const newEngine = buildEngine(false);
    engineRef.current = newEngine;
  }, []);

  return {
    isRunning,
    isReducedMotion,
    isOptedIn,
    start,
    stop,
    toggle,
    setSpeed,
    enableAutoScroll,
  };
}
