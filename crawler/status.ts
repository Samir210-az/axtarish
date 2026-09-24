import type { PageOutcome } from "./evaluate";

export type OfferStatus = "active" | "gone" | "out_of_stock";

export interface StatusUpdate {
  sourceId: string;
  pageUrl: string;
  status: OfferStatus;
}

export const STALE_CYCLE_NIGHTS = 25;

export function statusForFailure(reason: string, detail: string): OfferStatus | null {
  return reason === "http" && /\bHTTP (404|410)\b/.test(detail) ? "gone" : null;
}

export function statusForOutcome(outcome: PageOutcome): OfferStatus | null {
  return outcome === "outOfStock" ? "out_of_stock" : null;
}

export function cycleNights(total: number, processed: number): number | null {
  return processed > 0 ? Math.ceil(total / processed) : null;
}
