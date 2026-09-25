import { cosineSimilarity } from "./embeddings";
import { tokenMatches, tokensOf, type IndexedProduct, type ParsedQuery } from "./normalize";

export function relevanceScore(product: IndexedProduct, query: ParsedQuery): number {
  let score = 0;
  for (const token of query.tokens) {
    if (product.tokens.includes(token)) score += 3;
    else if (product.tokens.some((candidate) => tokenMatches(token, candidate))) score += 1;
  }
  return score;
}

/**
 * Sorğunun embedding-i (varsa) məhsulun saxlanılmış embedding-i ilə oxşarlığı
 * hesablayır. Açar-söz uyğunluğu bərabər olan məhsulları ayırd etmək üçün
 * ikinci dərəcəli meyar kimi istifadə olunur — açar-söz uyğunluğunu heç vaxt
 * üstələmir, çünki bu, mövcud "dəqiq uyğunluq prefiksdən əvvəl gəlir" davranışını
 * poza bilər.
 */
export function semanticScore(product: IndexedProduct, queryEmbedding: number[] | null): number {
  if (!queryEmbedding || !product.embedding) return 0;
  return cosineSimilarity(queryEmbedding, product.embedding);
}

export function rankCandidates(
  products: IndexedProduct[],
  query: ParsedQuery,
  queryEmbedding: number[] | null = null,
): IndexedProduct[] {
  const nameLength = new Map(products.map((p) => [p.id, tokensOf(p.displayName).length]));
  return [...products].sort(
    (a, b) =>
      relevanceScore(b, query) - relevanceScore(a, query) ||
      semanticScore(b, queryEmbedding) - semanticScore(a, queryEmbedding) ||
      (nameLength.get(a.id) ?? 0) - (nameLength.get(b.id) ?? 0) ||
      a.displayName.localeCompare(b.displayName, "az"),
  );
}
