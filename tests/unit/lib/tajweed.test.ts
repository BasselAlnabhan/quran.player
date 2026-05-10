import { describe, expect, it } from 'vitest';
import { parseTajweed } from '@/lib/tajweed';
import type { TajweedToken } from '@/lib/tajweed';

// Al-Fatiha ayah 1 verbatim from src/data/quran.json — do NOT import the JSON.
// This fixture is inlined so the test remains self-contained and fast.
const FATIHA_V1 =
  'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';

// Expected stripped text — Arabic letters only, markers removed.
// Derived by replacing [<code>[<content>] with <content>.
const FATIHA_V1_STRIPPED = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

describe('parseTajweed', () => {
  // (a) Empty input
  it('returns an empty array for empty input', () => {
    expect(parseTajweed('')).toEqual([]);
  });

  // (b) Plain-only input
  it('returns a single plain token when input has no markers', () => {
    const tokens = parseTajweed('hello arabic text');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'plain', text: 'hello arabic text' },
    ]);
  });

  // (c) Single marker mid-string
  it('returns plain, rule, plain tokens for a single marker surrounded by text', () => {
    const tokens = parseTajweed('start[h[ا]end');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'plain', text: 'start' },
      { kind: 'rule', ruleCode: 'h', text: 'ا' },
      { kind: 'plain', text: 'end' },
    ]);
  });

  // (d) Marker at the start — no leading empty plain token
  it('does not emit an empty plain token before a marker at the start of input', () => {
    const tokens = parseTajweed('[h[ا]rest');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'rule', ruleCode: 'h', text: 'ا' },
      { kind: 'plain', text: 'rest' },
    ]);
    expect(tokens[0]?.kind).toBe('rule');
  });

  // (e) Marker at the end — no trailing empty plain token
  it('does not emit an empty plain token after a marker at the end of input', () => {
    const tokens = parseTajweed('start[h[ا]');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'plain', text: 'start' },
      { kind: 'rule', ruleCode: 'h', text: 'ا' },
    ]);
    expect(tokens[tokens.length - 1]?.kind).toBe('rule');
  });

  // (f) Adjacent markers — no phantom plain between them
  it('emits no plain token between two adjacent markers', () => {
    const tokens = parseTajweed('[h[ا][l[ل]');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'rule', ruleCode: 'h', text: 'ا' },
      { kind: 'rule', ruleCode: 'l', text: 'ل' },
    ]);
    expect(tokens.every((t) => t.kind === 'rule')).toBe(true);
  });

  // (g) Multi-codepoint content (tatweel + superscript alef = 2 codepoints)
  it('preserves multi-codepoint content verbatim without splitting codepoints', () => {
    // ـٰ is U+0640 (tatweel) + U+0670 (arabic letter superscript alef)
    const multiCodepoint = 'ـٰ';
    expect(multiCodepoint.length).toBe(2);
    const tokens = parseTajweed(`prefix[n[${multiCodepoint}]suffix`);
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'plain', text: 'prefix' },
      { kind: 'rule', ruleCode: 'n', text: multiCodepoint },
      { kind: 'plain', text: 'suffix' },
    ]);
    expect(tokens[1]?.kind === 'rule' && tokens[1].text).toBe(multiCodepoint);
  });

  // (h) Unknown rule code passes through as-is
  it('returns a rule token with the literal code for an unrecognised rule code', () => {
    const tokens = parseTajweed('[zzz[ا]');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'rule', ruleCode: 'zzz', text: 'ا' },
    ]);
  });

  // (i) Colon-suffix code (e.g. h:1, h:2) — ruleCode is the literal string
  it('preserves the colon-digit suffix in ruleCode without stripping it', () => {
    const tokens = parseTajweed('[h:1[ٱ]');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'rule', ruleCode: 'h:1', text: 'ٱ' },
    ]);
    expect(tokens[0]?.kind === 'rule' && tokens[0].ruleCode).toBe('h:1');
  });

  // (j) Malformed: unclosed marker — recover as plain, no throw
  it('treats an unclosed marker as plain text and does not throw', () => {
    expect(() => parseTajweed('start[h[ا')).not.toThrow();
    const tokens = parseTajweed('start[h[ا');
    // The plain segment 'start' and the unclosed '[h[ا' are both emitted as plain.
    const allText = tokens.map((t) => t.text).join('');
    expect(allText).toBe('start[h[ا');
    expect(tokens.every((t) => t.kind === 'plain')).toBe(true);
  });

  // (k) Malformed: missing inner '[' — e.g. '[h]' — recover as plain, no throw
  it('treats a marker missing its inner bracket as plain text and does not throw', () => {
    expect(() => parseTajweed('[h]')).not.toThrow();
    const tokens = parseTajweed('[h]');
    expect(tokens).toEqual<TajweedToken[]>([{ kind: 'plain', text: '[h]' }]);
  });

  // (l) Real Al-Fatiha verse 1 fixture — token count and round-trip
  it('correctly tokenises Al-Fatiha ayah 1 with the expected number of tokens', () => {
    const tokens = parseTajweed(FATIHA_V1);
    // 6 plain segments + 7 rule markers = 13 tokens
    expect(tokens).toHaveLength(13);
  });

  it('round-trips Al-Fatiha ayah 1 so that concatenating token texts yields the stripped Arabic', () => {
    const tokens = parseTajweed(FATIHA_V1);
    const rejoined = tokens.map((t) => t.text).join('');
    expect(rejoined).toBe(FATIHA_V1_STRIPPED);
  });

  it('round-trips Al-Fatiha ayah 1 consistently with a regex-derived stripped form', () => {
    // Self-checking: derive expected stripped text by regex to cross-validate.
    const regexStripped = FATIHA_V1.replace(/\[[^[]+\[([^\]]*)\]/g, '$1');
    const tokens = parseTajweed(FATIHA_V1);
    const rejoined = tokens.map((t) => t.text).join('');
    expect(rejoined).toBe(regexStripped);
  });

  // Additional determinism check
  it('returns equivalent tokens on two calls with the same input', () => {
    const a = parseTajweed(FATIHA_V1);
    const b = parseTajweed(FATIHA_V1);
    expect(a).toEqual(b);
  });

  // Content with spaces (real pattern from data: [u:12[دًى ل])
  it('handles a marker whose content contains a space without losing characters', () => {
    const tokens = parseTajweed('[u:12[دًى ل]rest');
    expect(tokens).toEqual<TajweedToken[]>([
      { kind: 'rule', ruleCode: 'u:12', text: 'دًى ل' },
      { kind: 'plain', text: 'rest' },
    ]);
  });

  // Edge: empty rule code (two consecutive '[' with nothing between them)
  it('treats a marker with an empty rule code as plain text and does not throw', () => {
    // '[[ا]' — the code slice between the two '[' is empty
    expect(() => parseTajweed('[[ا]')).not.toThrow();
    const tokens = parseTajweed('[[ا]');
    // The entire fragment from the first '[' up to and including the second '[' is emitted
    // as plain; processing continues from after the second '['.
    const allText = tokens.map((t) => t.text).join('');
    expect(allText).toBe('[[ا]');
    expect(tokens.every((t) => t.kind === 'plain')).toBe(true);
  });

  // Fatiha rule tokens have the right codes
  it('extracts the correct rule codes from Al-Fatiha ayah 1', () => {
    const tokens = parseTajweed(FATIHA_V1);
    const ruleCodes = tokens
      .filter((t): t is Extract<TajweedToken, { kind: 'rule' }> => t.kind === 'rule')
      .map((t) => t.ruleCode);
    expect(ruleCodes).toEqual(['h:1', 'h:2', 'l', 'n', 'h:3', 'l', 'p']);
  });
});
