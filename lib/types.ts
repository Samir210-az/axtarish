import type { SortKey } from "./config";
export const VARIANTS = ["edt", "edp", "parfum", "elixir", "cologne"] as const;
export type Variant = (typeof VARIANTS)[number];

export const AUTHENTICITY = ["original", "replica", "unknown"] as const;
export type Authenticity = (typeof AUTHENTICITY)[number];

export const SOURCE_TYPES = ["online_store", "marketplace", "instagram", "tiktok"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SELLER_TYPES = ["store", "individual"] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export interface Product {
  id: string;
  displayName: string;
  brand: string;
  model: string;
  category: string;
  variant: Variant | null;
  volumeMl: number | null;
  aliases: string[];
  embedding: number[] | null;
}

export interface Offer {
  id: string;
  productId: string;
  priceAzn: number;
  oldPriceAzn: number | null;
  authenticity: Authenticity;
  sourceType: SourceType;
  sellerType: SellerType;
  sellerKey: string;
  sellerName: string | null;
  sellerUrl: string | null;
  effectiveAt: Date;
  cashOnly?: boolean;
}

export type SourceMix = Partial<Record<SourceType, number>>;

export type GroupStats =
  | {
      status: "ok";
      sellerCount: number;
      min: number;
      max: number;
      median: number;
      p25: number;
      p75: number;
      sourceMix: SourceMix;
      updatedAt: string;
    }
  | {
      status: "insufficient";
      sellerCount: number;
      prices: number[];
      sourceMix: SourceMix;
      updatedAt: string;
    };

export interface PublicOffer {
  seller: string | null;
  sellerUrl: string | null;
  sellerType: SellerType;
  priceAzn: number;
  oldPriceAzn: number | null;
  discountPct: number | null;
  authenticity: Authenticity;
  sourceType: SourceType;
  effectiveAt: string;
  cashOnly: boolean;
}

export interface ProductResult {
  productId: string;
  name: string;
  variant: Variant | null;
  volumeMl: number | null;
  groups: Array<{ authenticity: Authenticity; stats: GroupStats }>;
  offers: PublicOffer[];
  offersTruncated: boolean;
  sellerCount: number;
  minPriceAzn: number;
  maxPriceAzn: number;
  maxDiscountPct: number | null;
  sellerOffers: PublicOffer[];
}

export interface SearchResponse {
  windowDays: number;
  understood: boolean;
  matchedProducts: number;
  pricedProducts: number;
  examinedProducts: number;
  sort: SortKey;
  results: ProductResult[];
  generatedAt: string;
}
