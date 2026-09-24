import type { PageOutcome } from "./evaluate";

export type OfferStatus = "active" | "gone" | "out_of_stock";

export interface StatusUpdate {
  sourceId: string;
  pageUrl: string;
  status: OfferStatus;
}

export const STALE_CYCLE_NIGHTS = 25;
export const NIGHTLY_MINUTES = 40;

export function statusForFailure(reason: string, detail: string): OfferStatus | null {
  return reason === "http" && /\bHTTP (404|410)\b/.test(detail) ? "gone" : null;
}

export function statusForOutcome(outcome: PageOutcome): OfferStatus | null {
  return outcome === "outOfStock" ? "out_of_stock" : null;
}

export function cycleNights(
  total: number,
  processed: number,
  minutesUsed: number,
  nightlyMinutes: number = NIGHTLY_MINUTES,
): number | null {
  if (processed <= 0 || minutesUsed <= 0) return null;
  const perNight = (processed / minutesUsed) * nightlyMinutes;
  return Math.ceil(total / perNight);
}
