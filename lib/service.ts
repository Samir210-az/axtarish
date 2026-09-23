import {
  ALLOWED_WINDOWS,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  SEARCH_WINDOW_DAYS,
  isAllowedWindow,
} from "./config";
import { ConfigError } from "./firebaseAdmin";
import { loadOffers, loadProducts } from "./firestoreSource";
import { search } from "./search";
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

export type SearchOutcome =
  | { ok: true; data: SearchResponse }
  | { ok: false; status: 500 | 503; message: string };

export async function runSearch(q: string, days: number): Promise<SearchOutcome> {
  try {
    const data = await search(q, days, { loadProducts, loadOffers });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      return { ok: false, status: 503, message: "Baza hələ qoşulmayıb." };
    }
    console.error("Axtarış xətası:", error instanceof Error ? error.message : "naməlum xəta");
    return {
      ok: false,
      status: 500,
      message: "Axtarış zamanı xəta baş verdi. Bir az sonra yenidən yoxlayın.",
    };
  }
}
