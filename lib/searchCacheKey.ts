import { DEFAULT_SORT, MAX_RESULT_PRODUCTS, MAX_SHOW } from "./config";
import { parseQuery } from "./normalize";
import type { SearchOptions } from "./search";

export function searchCacheKey(q: string, days: number, options: SearchOptions = {}): string {
  const parsed = parseQuery(q);
  const limit = Math.max(1, Math.min(MAX_SHOW, options.limit ?? MAX_RESULT_PRODUCTS));
  return [
    [...parsed.tokens].sort().join(" "),
    parsed.volumeMl ?? "",
    parsed.variant ?? "",
    [...parsed.categories].sort().join(","),
    `d${days}`,
    options.sort ?? DEFAULT_SORT,
    `l${limit}`,
  ].join("|");
}
