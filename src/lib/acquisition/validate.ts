/**
 * Content quality validation for acquisition pipeline.
 * @see docs/features/04-acquisition-pipeline.md
 */

const MIN_CONTENT_LENGTH = 200;
const MIN_WORD_COUNT = 300;
const MAX_CONTENT_LENGTH = 100_000;

const PAYWALL_INDICATORS = [
  /subscribe\s+to\s+read/i,
  /log\s+in\s+to\s+read/i,
  /sign\s+in\s+to\s+continue/i,
  /members-only/i,
  /paywall/i,
  /premium\s+content/i,
  /you've\s+reached\s+your\s+article\s+limit/i,
  /free\s+articles\s+remaining/i,
  /subscribe\s+now\s+for\s+full\s+access/i,
  /unlock\s+this\s+article/i,
  /register\s+to\s+read/i,
];

export interface ValidationResult {
  valid: boolean;
  truncated?: boolean;
  paywalled?: boolean;
  content: string;
  wordCount: number;
}

/**
 * Validate and sanitize scraped content.
 * Enforces min/max length, detects paywalls, truncates if needed.
 */
export function validateContent(rawContent: string): ValidationResult {
  let content = rawContent?.trim() ?? "";

  const paywalled = PAYWALL_INDICATORS.some((re) => re.test(content));

  const wordCountInitial = countWords(content);
  if (
    content.length < MIN_CONTENT_LENGTH ||
    wordCountInitial < MIN_WORD_COUNT
  ) {
    return {
      valid: false,
      paywalled,
      content,
      wordCount: wordCountInitial,
    };
  }

  let truncated = false;
  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}\n\n[Content truncated]`;
    truncated = true;
  }

  const wordCount = countWords(content);

  return {
    valid: !paywalled,
    truncated,
    paywalled: paywalled || false,
    content,
    wordCount,
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
