import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library doesn't auto-cleanup with Vitest the way it does
// with Jest. Without this, components leak between tests.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia. The reader uses it for
// prefers-reduced-motion, so stub it here.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
