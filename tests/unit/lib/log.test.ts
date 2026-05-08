import { afterEach, describe, expect, it, vi } from 'vitest';
import { log } from '@/lib/log';

describe('log', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('calls console.warn with all arguments when not in production', () => {
    vi.stubEnv('PROD', false);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    log('hello', 42);

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith('hello', 42);
  });

  it('does not call console.warn when in production', () => {
    vi.stubEnv('PROD', true);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    log('should not appear');

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('is silent with no arguments in production', () => {
    vi.stubEnv('PROD', true);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    log();

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
