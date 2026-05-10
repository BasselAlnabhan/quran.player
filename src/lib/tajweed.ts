export type TajweedToken =
  | { kind: 'plain'; text: string }
  | { kind: 'rule'; ruleCode: string; text: string };

/**
 * Parses a tajweed-annotated ayah string into a flat token stream.
 *
 * Marker format (confirmed empirically from src/data/quran.json):
 *   [<code>[<content>]
 * where <code> may include a colon-digit suffix (e.g. "h:1") and
 * <content> is Arabic text that may contain spaces and combining marks.
 *
 * Returns [] for empty input — no token is emitted for an empty plain segment.
 */
export function parseTajweed(input: string): TajweedToken[] {
  if (input.length === 0) return [];

  const tokens: TajweedToken[] = [];
  let pos = 0;

  while (pos < input.length) {
    const openOuter = input.indexOf('[', pos);

    if (openOuter === -1) {
      // No more markers — remainder is plain text.
      tokens.push({ kind: 'plain', text: input.slice(pos) });
      break;
    }

    // Accumulate any plain text before this marker.
    if (openOuter > pos) {
      tokens.push({ kind: 'plain', text: input.slice(pos, openOuter) });
    }

    // Find the inner '[' that separates the rule code from the content.
    const openInner = input.indexOf('[', openOuter + 1);

    if (openInner === -1) {
      // No inner '[' found — treat everything from openOuter onward as plain.
      tokens.push({ kind: 'plain', text: input.slice(openOuter) });
      break;
    }

    const ruleCode = input.slice(openOuter + 1, openInner);

    // A valid rule code is non-empty and contains no ']' characters.
    // '[h]' (missing inner '[') has code 'h]' which contains ']' — reject it.
    if (ruleCode.length === 0 || ruleCode.includes(']')) {
      // Malformed — emit everything up to and including openInner as plain
      // and retry from the character after openInner.
      tokens.push({ kind: 'plain', text: input.slice(openOuter, openInner + 1) });
      pos = openInner + 1;
      continue;
    }

    // Find the closing ']' for the content.
    const closeIdx = input.indexOf(']', openInner + 1);

    if (closeIdx === -1) {
      // Unclosed marker — treat from openOuter onward as plain.
      tokens.push({ kind: 'plain', text: input.slice(openOuter) });
      break;
    }

    const content = input.slice(openInner + 1, closeIdx);
    tokens.push({ kind: 'rule', ruleCode, text: content });
    pos = closeIdx + 1;
  }

  return tokens;
}
