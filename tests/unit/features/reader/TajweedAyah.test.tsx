import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TajweedAyah from '@/features/reader/TajweedAyah';
import styles from '@/features/reader/TajweedAyah.module.css';

// Al-Fatiha ayah 1 verbatim from src/data/quran.json — inlined to keep the
// test self-contained and fast (no module import of the large JSON).
const FATIHA_V1 =
  'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';

// ---------------------------------------------------------------------------
// Acceptance criterion 1: plain-only text renders no spans
// ---------------------------------------------------------------------------

describe('TajweedAyah — plain text', () => {
  it('renders no <span> elements when the text contains no tajweed markers', () => {
    const { container } = render(<TajweedAyah text="plain text" />);
    expect(container.querySelectorAll('span').length).toBe(0);
  });

  it('renders the plain text content verbatim', () => {
    render(<TajweedAyah text="plain text" />);
    expect(screen.getByText('plain text')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 2: single rule marker with trailing plain text
// ---------------------------------------------------------------------------

describe('TajweedAyah — single rule marker', () => {
  it('renders exactly one <span> whose text is the rule content', () => {
    const { container } = render(<TajweedAyah text="[h[ٱ]rest" />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(1);
    expect(spans[0]?.textContent).toBe('ٱ');
  });

  it('renders the trailing plain text outside any span', () => {
    const { container } = render(<TajweedAyah text="[h[ٱ]rest" />);
    // The container's full text content must include the Arabic letter and 'rest'.
    expect(container.textContent).toContain('ٱ');
    expect(container.textContent).toContain('rest');
    // 'rest' must NOT be inside a span.
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(1);
    expect(spans[0]?.textContent).not.toContain('rest');
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 3: empty string renders nothing
// ---------------------------------------------------------------------------

describe('TajweedAyah — empty string', () => {
  it('renders nothing (empty fragment) for an empty string input', () => {
    const { container } = render(<TajweedAyah text="" />);
    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('span').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 4: adjacent markers — no phantom text between spans
// ---------------------------------------------------------------------------

describe('TajweedAyah — adjacent rule markers', () => {
  it('renders exactly two spans for two adjacent markers', () => {
    const { container } = render(<TajweedAyah text="[h[ا][n[ـٰ]" />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(2);
  });

  it('has no text content between the two adjacent spans', () => {
    const { container } = render(<TajweedAyah text="[h[ا][n[ـٰ]" />);
    const spans = container.querySelectorAll('span');
    // The two spans must be direct siblings with no intervening text node
    // that contains non-empty content.
    const firstSpan = spans[0];
    const secondSpan = spans[1];
    expect(firstSpan).toBeDefined();
    expect(secondSpan).toBeDefined();

    // Collect all text between the two spans by walking next siblings.
    let node = firstSpan?.nextSibling;
    let textBetween = '';
    while (node && node !== secondSpan) {
      if (node.nodeType === Node.TEXT_NODE) {
        textBetween += node.textContent ?? '';
      }
      node = node.nextSibling;
    }
    expect(textBetween).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 5: unknown code falls back to ruleUnknown class
// ---------------------------------------------------------------------------

describe('TajweedAyah — unknown rule code fallback', () => {
  it('renders one span with the ruleUnknown class for an unknown rule code', () => {
    const { container } = render(<TajweedAyah text="[zzz[ا]" />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(1);
    // The span's className must include the CSS module's ruleUnknown identifier.
    expect(spans[0]?.className).toContain(styles.ruleUnknown);
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 6: known code maps to the correct CSS class
// ---------------------------------------------------------------------------

describe('TajweedAyah — known rule code CSS class mapping', () => {
  it('applies the ruleHamzatulWasl class to a span for rule code "h"', () => {
    const { container } = render(<TajweedAyah text="[h[ا]" />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    // The CSS module class must be defined (non-empty string).
    expect(styles.ruleHamzatulWasl).toBeTruthy();
    expect(span?.className).toContain(styles.ruleHamzatulWasl);
  });

  it('applies ruleHamzatulWasl when the code has a colon-digit suffix like h:1', () => {
    const { container } = render(<TajweedAyah text="[h:1[ٱ]" />);
    const span = container.querySelector('span');
    expect(span?.className).toContain(styles.ruleHamzatulWasl);
  });

  it('applies ruleGhunnah for code "n"', () => {
    const { container } = render(<TajweedAyah text="[n[ـٰ]" />);
    expect(container.querySelector('span')?.className).toContain(styles.ruleGhunnah);
  });

  it('applies ruleQalqalah for code "p"', () => {
    const { container } = render(<TajweedAyah text="[p[ِي]" />);
    expect(container.querySelector('span')?.className).toContain(styles.ruleQalqalah);
  });

  it('applies ruleLamShamsiya for code "l"', () => {
    const { container } = render(<TajweedAyah text="[l[ل]" />);
    expect(container.querySelector('span')?.className).toContain(styles.ruleLamShamsiya);
  });

  it('applies ruleMadda for code "m"', () => {
    const { container } = render(<TajweedAyah text="[m[آ]" />);
    expect(container.querySelector('span')?.className).toContain(styles.ruleMadda);
  });

  it('applies ruleIkhfaIqlab for code "i"', () => {
    const { container } = render(<TajweedAyah text="[i[نب]" />);
    expect(container.querySelector('span')?.className).toContain(styles.ruleIkhfaIqlab);
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 7: no dangerouslySetInnerHTML — structural (source-level)
// This is enforced at code-review time. The tests below exercise the rendered
// output to confirm no raw HTML injection occurs.
// ---------------------------------------------------------------------------

describe('TajweedAyah — safe rendering', () => {
  it('does not inject raw HTML (bracket characters must not appear in output)', () => {
    const { container } = render(<TajweedAyah text="[h[ا]rest" />);
    expect(container.textContent).not.toContain('[');
    expect(container.textContent).not.toContain(']');
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 10: real-data smoke test — Al-Fatiha ayah 1
// ---------------------------------------------------------------------------

describe('TajweedAyah — real data smoke test (Al-Fatiha ayah 1)', () => {
  it('renders Al-Fatiha ayah 1 with no literal [ or ] characters in the output', () => {
    const { container } = render(<TajweedAyah text={FATIHA_V1} />);
    const rendered = container.textContent ?? '';
    expect(rendered.includes('[')).toBe(false);
    expect(rendered.includes(']')).toBe(false);
  });

  it('renders exactly 7 coloured spans for Al-Fatiha ayah 1 (7 rule tokens)', () => {
    // FATIHA_V1 has 7 rule markers: h:1, h:2, l, n, h:3, l, p
    const { container } = render(<TajweedAyah text={FATIHA_V1} />);
    expect(container.querySelectorAll('span').length).toBe(7);
  });

  it('the concatenated text content of Al-Fatiha ayah 1 matches the stripped Arabic', () => {
    const expected = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
    const { container } = render(<TajweedAyah text={FATIHA_V1} />);
    expect(container.textContent).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion (review fix): silent rule span has the ruleSilent class
// ---------------------------------------------------------------------------

describe('TajweedAyah — silent rule styling', () => {
  it("renders the silent rule's span with the ruleSilent class applied", () => {
    const { container } = render(<TajweedAyah text="[s[ا]" />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    // Asserting the class is wired correctly; italic styling flows from the CSS
    // rule — jsdom does not resolve computed styles from CSS modules.
    expect(span?.className).toContain(styles.ruleSilent);
  });
});

// ---------------------------------------------------------------------------
// Acceptance criterion 13: ruleClass helper coverage — exercise all known codes
// ---------------------------------------------------------------------------

describe('TajweedAyah — CSS class coverage for all defined rule codes', () => {
  const knownCodes: [string, string][] = [
    ['h', 'ruleHamzatulWasl'],
    ['n', 'ruleGhunnah'],
    ['p', 'ruleQalqalah'],
    ['m', 'ruleMadda'],
    ['l', 'ruleLamShamsiya'],
    ['i', 'ruleIkhfaIqlab'],
    ['s', 'ruleSilent'],
    ['u', 'ruleUnsuspected'],
    ['f', 'ruleIdghaam'],
    ['a', 'ruleAlif'],
    ['w', 'ruleWaw'],
    ['c', 'ruleMadda2'],
  ];

  for (const [code, className] of knownCodes) {
    it(`applies ${className} for code "${code}"`, () => {
      const { container } = render(<TajweedAyah text={`[${code}[ا]`} />);
      const span = container.querySelector('span');
      expect(span).not.toBeNull();
      // Access styles by the known class name key.
      const expectedClass = styles[className as keyof typeof styles];
      expect(expectedClass).toBeTruthy();
      expect(span?.className).toContain(expectedClass);
    });
  }
});
