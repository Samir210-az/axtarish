import { unstable_cache } from "next/cache";
import type { SearchOptions } from "./search";
import { searchCacheKey } from "./searchCacheKey";
import { runSearch, type SearchOutcome } from "./service";

export const SEARCH_CACHE_SECONDS = 1800;

class SearchFailure extends Error {
  constructor(readonly outcome: Extract<SearchOutcome, { ok: false }>) {
    super(outcome.message);
  }
}

export async function cachedRunSearch(q: string, days: number, options: SearchOptions = {}): Promise<SearchOutcome> {
  const key = searchCacheKey(q, days, options);
  try {
    const load = unstable_cache(
      async () => {
        console.info("axtarış keşi: bazadan oxunur", key);
        const outcome = await runSearch(q, days, options);
        if (!outcome.ok) throw new SearchFailure(outcome);
        return outcome.data;
      },
      ["search", key],
      { revalidate: SEARCH_CACHE_SECONDS },
    );
    return { ok: true, data: await load() };
  } catch (error) {
    if (error instanceof SearchFailure) return error.outcome;
    console.error("Keşli axtarış xətası:", error instanceof Error ? error.message : "naməlum xəta");
    return { ok: false, status: 500, message: "Axtarış zamanı xəta baş verdi. Bir az sonra yenidən yoxlayın." };
  }
}
