import { tokensOf, type ParsedQuery } from "./normalize";

export const KEY_MAX = 8;

const NUMERIC = /^\d+$/;

export function keysForToken(token: string): string[] {
  if (NUMERIC.test(token) || token.length < 3) return [token.slice(0, KEY_MAX)];
  const keys: string[] = [];
  for (let length = 3; length <= Math.min(token.length, KEY_MAX); length += 1) keys.push(token.slice(0, length));
  return keys;
}

export interface KeyFields {
  brand: string;
  model: string;
  displayName: string;
  aliases: string[];
}

export function searchKeysFor(fields: KeyFields): string[] {
  const source = [fields.brand, fields.model, fields.displayName, ...fields.aliases].join(" ");
  const keys = new Set<string>();
  for (const token of new Set(tokensOf(source))) {
    for (const key of keysForToken(token)) keys.add(key);
  }
  return [...keys];
}

export function pickQueryKey(tokens: string[]): string | null {
  if (tokens.length === 0) return null;
  const longest = tokens.reduce((best, token) => (token.length > best.length ? token : best));
  return longest.slice(0, KEY_MAX);
}

export type ProductQueryPlan = { kind: "key"; key: string } | { kind: "category"; categories: string[] };

export function planProductQuery(query: ParsedQuery): ProductQueryPlan | null {
  const key = pickQueryKey(query.tokens);
  if (key) return { kind: "key", key };
  if (query.categories.length > 0) return { kind: "category", categories: query.categories };
  return null;
}
