import { tokenMatches, tokensOf, type IndexedProduct, type ParsedQuery } from "./normalize";

export function relevanceScore(product: IndexedProduct, query: ParsedQuery): number {
  let score = 0;
  for (const token of query.tokens) {
    if (product.tokens.includes(token)) score += 3;
    else if (product.tokens.some((candidate) => tokenMatches(token, candidate))) score += 1;
  }
  return score;
}

export function rankCandidates(products: IndexedProduct[], query: ParsedQuery): IndexedProduct[] {
  const nameLength = new Map(products.map((p) => [p.id, tokensOf(p.displayName).length]));
  return [...products].sort(
    (a, b) =>
      relevanceScore(b, query) - relevanceScore(a, query) ||
      (nameLength.get(a.id) ?? 0) - (nameLength.get(b.id) ?? 0) ||
      a.displayName.localeCompare(b.displayName, "az"),
  );
}
