/**
 * @module split
 * Splits text content into animatable spans (chars, words, lines)
 * while preserving screen reader accessibility via aria-hidden/aria-label.
 */

export type SplitType = 'chars' | 'words' | 'lines' | 'words,chars' | 'lines,words';

export interface SplitOptions {
  /**
   * What to split into. Can combine with comma.
   * @default 'chars'
   */
  type?: SplitType;
  /**
   * CSS class prefix for generated spans.
   * @default 'zg'
   */
  prefix?: string;
}

export interface SplitResult {
  /** All character `<span>` elements, in order */
  chars: HTMLElement[];
  /** All word `<span>` elements, in order */
  words: HTMLElement[];
  /** All line `<span>` elements, in order */
  lines: HTMLElement[];
  /** Restores the original inner HTML */
  revert: () => void;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const span = document.createElement(tag);
  span.className = className;
  if (text !== undefined) span.textContent = text;
  return span;
}

/**
 * Splits the text content of an element into animated `<span>` units.
 * Preserves the original text for screen readers via `aria-label`.
 *
 * @example
 * ```ts
 * const { chars, revert } = splitText(document.querySelector('h1'), { type: 'chars' });
 * animate(chars, { y: [40, 0], opacity: [0, 1] }, { spring: 'snappy', stagger: 30 });
 * ```
 */
export function splitText(element: HTMLElement, options?: SplitOptions): SplitResult {
  const type = options?.type ?? 'chars';
  const prefix = options?.prefix ?? 'zg';
  const originalHTML = element.innerHTML;
  const originalText = element.textContent ?? '';

  // Preserve accessibility: hide the split spans from AT, keep aria-label
  element.setAttribute('aria-label', originalText);

  const splitChars = type.includes('chars');
  const splitWords = type.includes('words') || splitChars;
  const splitLines = type.includes('lines');

  const chars: HTMLElement[] = [];
  const words: HTMLElement[] = [];
  let lines: HTMLElement[] = [];

  if (splitLines) {
    // Lines require a two-pass approach: render, measure, then split
    lines = measureLines(element, originalText, prefix, splitWords, splitChars, chars, words);
  } else {
    // Simple word/char split
    const wordTokens = originalText.split(/(\s+)/);
    const fragment = document.createDocumentFragment();

    for (const token of wordTokens) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        // Preserve whitespace as a text node
        fragment.appendChild(document.createTextNode(token));
        continue;
      }

      if (splitWords) {
        const wordSpan = el('span', `${prefix}-word`);
        wordSpan.setAttribute('aria-hidden', 'true');

        if (splitChars) {
          for (const char of token) {
            const charSpan = el('span', `${prefix}-char`, char);
            charSpan.setAttribute('aria-hidden', 'true');
            charSpan.style.display = 'inline-block';
            wordSpan.appendChild(charSpan);
            chars.push(charSpan);
          }
        } else {
          wordSpan.textContent = token;
        }

        wordSpan.style.display = 'inline-block';
        fragment.appendChild(wordSpan);
        words.push(wordSpan);
      }
    }

    element.innerHTML = '';
    element.appendChild(fragment);
  }

  return {
    chars,
    words,
    lines,
    revert() {
      element.innerHTML = originalHTML;
      element.removeAttribute('aria-label');
    },
  };
}

/**
 * Two-pass line detection: render words, measure their bounding boxes,
 * then group words that share the same top offset into line wrappers.
 */
function measureLines(
  element: HTMLElement,
  text: string,
  prefix: string,
  _splitWords: boolean,
  splitChars: boolean,
  chars: HTMLElement[],
  words: HTMLElement[]
): HTMLElement[] {
  const wordTokens = text.split(/(\s+)/);
  const fragment = document.createDocumentFragment();
  const tempWords: { span: HTMLElement; isSpace: boolean }[] = [];

  // First pass: render all word spans
  for (const token of wordTokens) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      const space = document.createTextNode(' ');
      fragment.appendChild(space);
      continue;
    }

    const wordSpan = el('span', `${prefix}-word`);
    wordSpan.setAttribute('aria-hidden', 'true');
    wordSpan.style.display = 'inline-block';

    if (splitChars) {
      for (const char of token) {
        const charSpan = el('span', `${prefix}-char`, char);
        charSpan.setAttribute('aria-hidden', 'true');
        charSpan.style.display = 'inline-block';
        wordSpan.appendChild(charSpan);
        chars.push(charSpan);
      }
    } else {
      wordSpan.textContent = token;
    }

    fragment.appendChild(wordSpan);
    words.push(wordSpan);
    tempWords.push({ span: wordSpan, isSpace: false });
  }

  element.innerHTML = '';
  element.appendChild(fragment);

  // Second pass: measure top offsets to group into lines
  const lineGroups = new Map<number, HTMLElement[]>();
  for (const wordSpan of words) {
    const top = Math.round(wordSpan.getBoundingClientRect().top);
    if (!lineGroups.has(top)) lineGroups.set(top, []);
    lineGroups.get(top)!.push(wordSpan);
  }

  // Third pass: wrap each line group in a line span
  const lines: HTMLElement[] = [];
  const sortedTops = Array.from(lineGroups.keys()).sort((a, b) => a - b);

  element.innerHTML = '';
  for (const top of sortedTops) {
    const lineSpan = el('span', `${prefix}-line`);
    lineSpan.setAttribute('aria-hidden', 'true');
    lineSpan.style.display = 'block';
    lineSpan.style.overflow = 'hidden'; // mask effect

    const lineWords = lineGroups.get(top)!;
    for (let i = 0; i < lineWords.length; i++) {
      lineSpan.appendChild(lineWords[i]!);
      if (i < lineWords.length - 1) {
        lineSpan.appendChild(document.createTextNode(' '));
      }
    }

    element.appendChild(lineSpan);
    lines.push(lineSpan);
  }

  return lines;
}
