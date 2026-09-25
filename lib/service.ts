import {
  ALLOWED_WINDOWS,
  DEFAULT_SORT,
  MAX_QUERY_LENGTH,
  MAX_RESULT_PRODUCTS,
  MAX_SHOW,
  MIN_QUERY_LENGTH,
  SEARCH_WINDOW_DAYS,
  isAllowedWindow,
  isSortKey,
  type SortKey,
} from "./config";
import { embedText } from "./embeddings";
import { ConfigError } from "./firebaseAdmin";
import { loadOffers, loadProducts } from "./firestoreSource";
import { search, type SearchOptions } from "./search";
import type { SearchResponse } from "./types";

export type ValidatedInput = { ok: true; q: string; days: number } | { ok: false; message: string };

export function validateSearchInput(rawQuery: string, rawDays: string | undefined): ValidatedInput {
  const q = rawQuery.trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return { ok: false, message: `Ən azı ${MIN_QUERY_LENGTH} simvol yazın.` };
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return { ok: false, message: `Sorğu ${MAX_QUERY_LENGTH} simvoldan uzun ola bilməz.` };
  }
  const days = rawDays === undefined || rawDays === "" ? SEARCH_WINDOW_DAYS : Number(rawDays);
  if (!isAllowedWindow(days)) {
    return { ok: false, message: `Müddət ${ALLOWED_WINDOWS.join(", ")} gün ola bilər.` };
  }
  return { ok: true, q, days };
}

export function parseListOptions(
  rawSort: string | null | undefined,
  rawShow: string | null | undefined,
): { sort: SortKey; limit: number } {
  const sort = rawSort && isSortKey(rawSort) ? rawSort : DEFAULT_SORT;
  const shown = Number(rawShow);
  const limit =
    Number.isInteger(shown) && shown >= MAX_RESULT_PRODUCTS ? Math.min(shown, MAX_SHOW) : MAX_RESULT_PRODUCTS;
  return { sort, limit };
}

export function isQuotaError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
  const message = error instanceof Error ? error.message : "";
  return code === 8 || /RESOURCE_EXHAUSTED|quota exceeded/i.test(message);
}

export type SearchOutcome = { ok: true; data: SearchResponse } | { ok: false; status: 500 | 503; message: string };

export async function runSearch(q: string, days: number, options: SearchOptions = {}): Promise<SearchOutcome> {
  try {
    const data = await search(
      q,
      days,
      { loadProducts, loadOffers, embedQuery: (text) => embedText(text, "RETRIEVAL_QUERY") },
      options,
    );
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      return { ok: false, status: 503, message: "Baza hələ qoşulmayıb." };
    }
    console.error("Axtarış xətası:", error instanceof Error ? error.message : "naməlum xəta");
    if (isQuotaError(error)) {
      return { ok: false, status: 503, message: "Sayt müvəqqəti yüklənib. Bir neçə saatdan sonra yenidən yoxlayın." };
    }
    return {
      ok: false,
      status: 500,
      message: "Axtarış zamanı xəta baş verdi. Bir az sonra yenidən yoxlayın.",
    };
  }
}
