import {
  DEFAULT_SORT,
  MAX_CANDIDATE_PRODUCTS,
  MAX_OFFERS_SHOWN_PER_PRODUCT,
  MAX_RESULT_PRODUCTS,
  MAX_SHOW,
  type SortKey,
} from "./config";
import { indexProducts, matchProducts, parseQuery, type ParsedQuery } from "./normalize";
import { rankCandidates } from "./relevance";
import { sortResults } from "./sortResults";
import { round2, statsByAuthenticity, latestPerSeller } from "./stats";
import { safeHttpUrl } from "./url";
import type { Offer, Product, ProductResult, PublicOffer, SearchResponse } from "./types";

export interface SearchDeps {
  loadProducts: (query: ParsedQuery) => Promise<Product[]>;
  loadOffers: (productIds: string[], since: Date) => Promise<Offer[]>;
  now?: () => Date;
}

export interface SearchOptions {
  sort?: SortKey;
  limit?: number;
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
    discountPct: hasDiscount ? Math.round((1 - offer.priceAzn / (offer.oldPriceAzn as number)) * 100) : null,
    authenticity: offer.authenticity,
    sourceType: offer.sourceType,
    effectiveAt: offer.effectiveAt.toISOString(),
    cashOnly: offer.cashOnly === true,
  };
}

export async function search(
  rawQuery: string,
  days: number,
  deps: SearchDeps,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const sort = options.sort ?? DEFAULT_SORT;
  const limit = Math.max(1, Math.min(MAX_SHOW, options.limit ?? MAX_RESULT_PRODUCTS));
  const now = (deps.now ?? (() => new Date()))();
  const base = { windowDays: days, generatedAt: now.toISOString() };

  const query = parseQuery(rawQuery);
  if (query.tokens.length === 0 && query.categories.length === 0) {
    return {
      ...base,
      understood: false,
      matchedProducts: 0,
      pricedProducts: 0,
      examinedProducts: 0,
      sort,
      results: [],
    };
  }

  const index = indexProducts(await deps.loadProducts(query));
  const matched = matchProducts(index, query);
  if (matched.length === 0) {
    return { ...base, understood: true, matchedProducts: 0, pricedProducts: 0, examinedProducts: 0, sort, results: [] };
  }

  const candidates = rankCandidates(matched, query).slice(0, MAX_CANDIDATE_PRODUCTS);

  const since = new Date(now.getTime() - days * DAY_MS);
  const offers = (
    await deps.loadOffers(
      candidates.map((p) => p.id),
      since,
    )
  ).filter((o) => o.effectiveAt >= since && o.effectiveAt <= now);

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
    const sellerOffers = latestPerSeller(productOffers)
      .sort((a, b) => a.priceAzn - b.priceAzn)
      .map(toPublicOffer);
    const discounts = sellerOffers.map((o) => o.discountPct).filter((d): d is number => d !== null);
    results.push({
      productId: product.id,
      name: product.displayName,
      variant: product.variant,
      volumeMl: product.volumeMl,
      groups: statsByAuthenticity(productOffers),
      offers: shown.slice(0, MAX_OFFERS_SHOWN_PER_PRODUCT).map(toPublicOffer),
      offersTruncated: shown.length > MAX_OFFERS_SHOWN_PER_PRODUCT,
      sellerCount: sellerOffers.length,
      minPriceAzn: sellerOffers[0]?.priceAzn ?? 0,
      maxPriceAzn: sellerOffers[sellerOffers.length - 1]?.priceAzn ?? 0,
      maxDiscountPct: discounts.length > 0 ? Math.max(...discounts) : null,
      sellerOffers,
    });
  }

  const ordered = sortResults(results, sort);
  return {
    ...base,
    understood: true,
    matchedProducts: matched.length,
    pricedProducts: ordered.length,
    examinedProducts: candidates.length,
    sort,
    results: ordered.slice(0, limit),
  };
}
