export const ALLOWED_WINDOWS = [7, 15, 30, 90] as const;
export type WindowDays = (typeof ALLOWED_WINDOWS)[number];

export const SEARCH_WINDOW_DAYS: WindowDays = 30;
export const MIN_SELLERS_FOR_STATS = 3;

export const MAX_QUERY_LENGTH = 80;
export const MIN_QUERY_LENGTH = 2;

export const MAX_CANDIDATE_PRODUCTS = 30;
export const MAX_RESULT_PRODUCTS = 12;
export const MAX_OFFERS_PER_QUERY = 1500;
export const MAX_OFFERS_SHOWN_PER_PRODUCT = 50;

export const MAX_PRODUCTS_PER_KEY = 1500;
export const PRODUCT_CACHE_TTL_MS = 60_000;
export const PRODUCT_CACHE_MAX_ENTRIES = 200;

export function isAllowedWindow(value: number): value is WindowDays {
  return (ALLOWED_WINDOWS as readonly number[]).includes(value);
}
