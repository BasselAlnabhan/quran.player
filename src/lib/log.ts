// Forward to console.warn (not console.log — banned by CLAUDE.md) in dev,
// no-op in production so we don't leak debug output to users.
export function log(...args: unknown[]): void {
  if (!import.meta.env.PROD) {
    console.warn(...args);
  }
}
