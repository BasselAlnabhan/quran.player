import { parseTajweed } from '@/lib/tajweed';
import rawStyles from './TajweedAyah.module.css';

// CSS Module exports are typed with a string index signature; under
// noUncheckedIndexedAccess each access yields string | undefined.
// We narrow once here to a plain string map so callers don't need
// per-entry assertions.
const styles: Record<string, string> = rawStyles;

/*
 * Maps the base rule code (with any :N suffix stripped) to the corresponding
 * CSS Module class. The :N suffix is a per-instance disambiguator in the data
 * (e.g. h:1, h:2, h:3 all belong to the Hamzat ul-wasl family).
 */
const RULE_CLASS_MAP: Record<string, string> = {
  h: styles['ruleHamzatulWasl'] ?? '',
  n: styles['ruleGhunnah'] ?? '',
  p: styles['ruleQalqalah'] ?? '',
  m: styles['ruleMadda'] ?? '',
  l: styles['ruleLamShamsiya'] ?? '',
  i: styles['ruleIkhfaIqlab'] ?? '',
  s: styles['ruleSilent'] ?? '',
  u: styles['ruleUnsuspected'] ?? '',
  f: styles['ruleIdghaam'] ?? '',
  a: styles['ruleAlif'] ?? '',
  w: styles['ruleWaw'] ?? '',
  c: styles['ruleMadda2'] ?? '',
};

/** Returns the CSS Module class for a given rule code, falling back gracefully. */
function ruleClass(code: string): string {
  // Strip the :N suffix (e.g. 'h:1' → 'h') before looking up the palette.
  const base = code.split(':')[0] ?? code;
  // RULE_CLASS_MAP[base] is string | undefined under noUncheckedIndexedAccess;
  // fall back to ruleUnknown (always present) so unknown codes are never invisible.
  return RULE_CLASS_MAP[base] ?? styles['ruleUnknown'] ?? '';
}

type Props = {
  text: string;
};

/**
 * Renders a single tajweed-annotated ayah string as a mixed inline sequence
 * of bare text nodes (plain segments) and coloured <span>s (rule segments).
 *
 * Plain tokens are NOT wrapped in any element to preserve Arabic cursive
 * joining across the rendered output. Rule tokens get exactly one span with
 * a colour class — no inner whitespace, no padding, no border.
 */
export default function TajweedAyah({ text }: Props) {
  const tokens = parseTajweed(text);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.kind === 'plain') {
          // Bare string — React handles mixing strings and elements in a map
          // result; strings do not need keys. Only non-string children need keys.
          return token.text;
        }
        return (
          <span key={i} className={ruleClass(token.ruleCode)}>
            {token.text}
          </span>
        );
      })}
    </>
  );
}
