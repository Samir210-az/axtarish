import { round2 } from "./stats";
import type { PublicOffer } from "./types";

export interface Comparison {
  cheapest: PublicOffer;
  priciest: PublicOffer;
  diffAzn: number;
  diffPct: number;
}

export function compareTwo(offers: PublicOffer[]): Comparison | null {
  if (offers.length !== 2) return null;
  const [cheapest, priciest] = [...offers].sort((a, b) => a.priceAzn - b.priceAzn) as [PublicOffer, PublicOffer];
  const diffAzn = round2(priciest.priceAzn - cheapest.priceAzn);
  return { cheapest, priciest, diffAzn, diffPct: Math.round((diffAzn / cheapest.priceAzn) * 100) };
}
