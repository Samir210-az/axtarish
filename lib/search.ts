import {
  MAX_CANDIDATE_PRODUCTS,
  MAX_OFFERS_SHOWN_PER_PRODUCT,
  MAX_RESULT_PRODUCTS,
} from "./config";
import { indexProducts, matchProducts, parseQuery } from "./normalize";
import { round2, statsByAuthenticity, latestPerSeller } from "./stats";
import { safeHttpUrl } from "./url";
import type { Offer, Product, ProductResult, PublicOffer, SearchResponse } from "./types";

export interface SearchDeps {
  loadProducts: () => Promise<Product[]>;
  loadOffers: (productIds: string[], since: Date) => Promise<Offer[]>;
  now?: () => Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function toPublicOffer(offer: Offer): PublicOffer {
  const isStore = offer.sellerType === "store";
  const hasDiscount = offer.oldPriceAzn !== null && offer.oldPriceAzn > offer.priceAzn;
  return {
    seller: isStore ? offer.sellerName : null,
    sellerUrl: isStore ? safeHttpUrl(offer.sellerUrl) : null,
    sellerType: offer.sellerType,
    priceAzn: round2(offer.priceAzn),
    oldPriceAzn: hasDiscount ? round2(offer.oldPriceAzn as number) : null,
    discountPct: hasDiscount
      ? Math.round((1 - offer.priceAzn / (offer.oldPriceAzn as number)) * 100)
      : null,
    authenticity: offer.authenticity,
    sourceType: offer.sourceType,
    effectiveAt: offer.effectiveAt.toISOString(),
  };
}

export async function search(rawQuery: string, days: number, deps: SearchDeps): Promise<SearchResponse> {
  const now = (deps.now ?? (() => new Date()))();
  const base = { windowDays: days, generatedAt: now.toISOString() };

  const query = parseQuery(rawQuery);
  if (query.tokens.length === 0 && query.categories.length === 0) {
    return { ...base, understood: false, matchedProducts: 0, results: [] };
  }

  const index = indexProducts(await deps.loadProducts());
  const matched = matchProducts(index, query);
  if (matched.length === 0) {
    return { ...base, understood: true, matchedProducts: 0, results: [] };
  }

  const candidates = [...matched]
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "az"))
    .slice(0, MAX_CANDIDATE_PRODUCTS);

  const since = new Date(now.getTime() - days * DAY_MS);
  const offers = (await deps.loadOffers(candidates.map((p) => p.id), since)).filter(
    (o) => o.effectiveAt >= since && o.effectiveAt <= now,
  );

  const offersByProduct = new Map<string, Offer[]>();
  for (const offer of offers) {
    const list = offersByProduct.get(offer.productId);
    if (list) list.push(offer);
    else offersByProduct.set(offer.productId, [offer]);
  }

  const results: ProductResult[] = [];
  for (const product of candidates) {
    const productOffers = offersByProduct.get(product.id);
    if (!productOffers || productOffers.length === 0) continue;
    const shown = [...productOffers].sort((a, b) => a.priceAzn - b.priceAzn);
    results.push({
      productId: product.id,
      name: product.displayName,
      variant: product.variant,
      volumeMl: product.volumeMl,
      groups: statsByAuthenticity(productOffers),
      offers: shown.slice(0, MAX_OFFERS_SHOWN_PER_PRODUCT).map(toPublicOffer),
      offersTruncated: shown.length > MAX_OFFERS_SHOWN_PER_PRODUCT,
    });
  }

  const sellerTotals = new Map(
    results.map((r) => [r.productId, latestPerSeller(offersByProduct.get(r.productId) ?? []).length]),
  );
  results.sort(
    (a, b) =>
      (sellerTotals.get(b.productId) ?? 0) - (sellerTotals.get(a.productId) ?? 0) ||
      a.name.localeCompare(b.name, "az"),
  );

  return {
    ...base,
    understood: true,
    matchedProducts: matched.length,
    results: results.slice(0, MAX_RESULT_PRODUCTS),
  };
}
