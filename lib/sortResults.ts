import type { SortKey } from "./config";
import type { ProductResult } from "./types";

const bySellers = (a: ProductResult, b: ProductResult): number => b.sellerCount - a.sellerCount;

export function sortResults(results: ProductResult[], sort: SortKey): ProductResult[] {
  const list = [...results];
  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => a.minPriceAzn - b.minPriceAzn || bySellers(a, b));
    case "price_desc":
      return list.sort((a, b) => b.minPriceAzn - a.minPriceAzn || bySellers(a, b));
    case "discount":
      return list.sort((a, b) => (b.maxDiscountPct ?? -1) - (a.maxDiscountPct ?? -1) || bySellers(a, b));
    default:
      return list.sort(bySellers);
  }
}
