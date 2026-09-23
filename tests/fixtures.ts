import type { Offer, Product } from "@/lib/types";

export const NOW = new Date("2026-09-23T12:00:00Z");

export function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    displayName: "Dior Sauvage Eau de Parfum 100 ml",
    brand: "Dior",
    model: "Sauvage",
    category: "perfume",
    variant: "edp",
    volumeMl: 100,
    aliases: [],
    ...overrides,
  };
}

let counter = 0;

export function offer(overrides: Partial<Offer> = {}): Offer {
  counter += 1;
  return {
    id: `o${counter}`,
    productId: "p1",
    priceAzn: 100,
    oldPriceAzn: null,
    authenticity: "original",
    sourceType: "online_store",
    sellerType: "store",
    sellerKey: `seller-${counter}`,
    sellerName: `Mağaza ${counter}`,
    sellerUrl: "https://example.az",
    effectiveAt: daysAgo(1),
    ...overrides,
  };
}
