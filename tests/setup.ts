import '@testing-library/jest-dom/vitest';

// @testing-library/react 16.x auto-cleans after each test in Vitest via its
// own afterEach hook — no manual cleanup() call needed here.

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
