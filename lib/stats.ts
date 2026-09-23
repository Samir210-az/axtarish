import { MIN_SELLERS_FOR_STATS } from "./config";
import { AUTHENTICITY } from "./types";
import type { Authenticity, GroupStats, Offer, SourceMix } from "./types";

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new RangeError("Boş siyahıdan percentile hesablanmaz");
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (rank - lo);
}

export function latestPerSeller(offers: readonly Offer[]): Offer[] {
  const latest = new Map<string, Offer>();
  for (const offer of offers) {
    const current = latest.get(offer.sellerKey);
    if (!current || offer.effectiveAt > current.effectiveAt) latest.set(offer.sellerKey, offer);
  }
  return [...latest.values()];
}

export function computeGroupStats(
  offers: readonly Offer[],
  minSellers: number = MIN_SELLERS_FOR_STATS,
): GroupStats | null {
  const perSeller = latestPerSeller(offers);
  if (perSeller.length === 0) return null;

  const prices = perSeller.map((o) => o.priceAzn).sort((a, b) => a - b);
  const sourceMix: SourceMix = {};
  let updated = perSeller[0]!.effectiveAt;
  for (const offer of perSeller) {
    sourceMix[offer.sourceType] = (sourceMix[offer.sourceType] ?? 0) + 1;
    if (offer.effectiveAt > updated) updated = offer.effectiveAt;
  }
  const updatedAt = updated.toISOString();

  if (perSeller.length < minSellers) {
    return {
      status: "insufficient",
      sellerCount: perSeller.length,
      prices: prices.map(round2),
      sourceMix,
      updatedAt,
    };
  }

  return {
    status: "ok",
    sellerCount: perSeller.length,
    min: round2(prices[0] as number),
    max: round2(prices[prices.length - 1] as number),
    median: round2(percentile(prices, 0.5)),
    p25: round2(percentile(prices, 0.25)),
    p75: round2(percentile(prices, 0.75)),
    sourceMix,
    updatedAt,
  };
}

export function statsByAuthenticity(
  offers: readonly Offer[],
): Array<{ authenticity: Authenticity; stats: GroupStats }> {
  const groups: Array<{ authenticity: Authenticity; stats: GroupStats }> = [];
  for (const authenticity of AUTHENTICITY) {
    const stats = computeGroupStats(offers.filter((o) => o.authenticity === authenticity));
    if (stats) groups.push({ authenticity, stats });
  }
  return groups;
}
