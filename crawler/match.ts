import { parseQuery, tokenMatches, tokensOf } from "../lib/normalize";

export function querySpec(query: string): { tokens: string[]; volumeMl: number | null } {
  const parsed = parseQuery(query);
  return { tokens: parsed.tokens, volumeMl: parsed.volumeMl };
}

function urlWords(rawUrl: string): string[] {
  try {
    let path = new URL(rawUrl).pathname;
    try {
      path = decodeURIComponent(path);
    } catch {
      /* dəyişməz qalır */
    }
    return tokensOf(path.replace(/[/_.\-+]+/g, " "));
  } catch {
    return [];
  }
}

function allTokensMatch(tokens: string[], words: string[]): boolean {
  return tokens.length > 0 && tokens.every((token) => words.some((word) => tokenMatches(token, word)));
}

export function urlMatchesQuery(rawUrl: string, query: string): boolean {
  return allTokensMatch(querySpec(query).tokens, urlWords(rawUrl));
}

export function hasWordSlug(rawUrl: string): boolean {
  try {
    const segments = new URL(rawUrl).pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return false;
    let decoded = last;
    try {
      decoded = decodeURIComponent(last);
    } catch {
      /* dəyişməz qalır */
    }
    const parts = tokensOf(decoded.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_+]+/g, " "));
    return parts.length >= 2 && parts.some((part) => /[a-z]{3,}/.test(part));
  } catch {
    return false;
  }
}

export function textMatchesQuery(text: string, query: string): boolean {
  return allTokensMatch(querySpec(query).tokens, tokensOf(text));
}
