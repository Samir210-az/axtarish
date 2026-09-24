import { isExcludedText } from "./exclude";
import { identify } from "./identity";
import { extractProduct } from "./jsonld";
import { querySpec, textMatchesQuery } from "./match";
import { extractArazProduct } from "./nextRsc";
import { extractNopOldPrice } from "./nop";
import { adSellerKey } from "./sellers";
import { extractTapAd } from "./tap";
import { extractTapalAd } from "./tapal";
import { extractWooProduct } from "./woo";
import type { Source } from "./sources";
import type { SaveItem } from "./store";

export type PageOutcome = "ok" | "noData" | "outOfStock" | "unidentified" | "mismatch" | "excluded" | "generic";

const CATEGORY_HINT: Record<string, string> = { parfüm: "perfume", elektronika: "electronics" };

export function defaultCategoryOf(source: Source): string | undefined {
  return source.categories.length === 1 ? CATEGORY_HINT[source.categories[0] as string] : undefined;
}

export function isSpecificAd(hasBrand: boolean, nameKey: string | null): boolean {
  if (!nameKey) return false;
  const tokens = (nameKey.split("|")[0] ?? "").split("-").filter(Boolean);
  if (tokens.length < 2) return false;
  if (tokens.some((token) => /\d/.test(token) && token.length >= 2)) return true;
  return hasBrand && tokens.length >= 3;
}

export function evaluatePage(
  source: Source,
  page: { url: string; body: string },
  query?: string,
): { outcome: PageOutcome; item?: SaveItem } {
  const product =
    source.adapter === "araz-rsc"
      ? extractArazProduct(page.body, page.url)
      : source.adapter === "woo-html"
        ? extractWooProduct(page.body)
        : source.adapter === "tapal-title"
          ? extractTapalAd(page.body, page.url)
          : source.adapter === "tap-jsonld"
            ? extractTapAd(page.body, page.url)
            : extractProduct(page.body);
  if (!product) return { outcome: "noData" };
  if (isExcludedText(`${product.brand ?? ""} ${product.name}`)) return { outcome: "excluded" };
  if (source.adapter === "generic-jsonld" && product.oldPriceAzn === null) {
    const oldPrice = extractNopOldPrice(page.body);
    if (oldPrice !== null && oldPrice > product.priceAzn) product.oldPriceAzn = oldPrice;
  }
  if (product.availability === "out_of_stock") return { outcome: "outOfStock" };
  if (query && !textMatchesQuery(`${product.brand ?? ""} ${product.name}`, query)) return { outcome: "mismatch" };

  const identity = identify(product, {
    storeNames: [source.name, new URL(source.url).hostname.split(".")[0] ?? ""],
    defaultCategory: defaultCategoryOf(source),
  });
  if (!identity) return { outcome: "unidentified" };
  if (source.kind === "marketplace" && !isSpecificAd(product.brand !== null, identity.nameKey))
    return { outcome: "generic" };
  const wantedVolume = query ? querySpec(query).volumeMl : null;
  if (wantedVolume !== null && identity.volumeMl !== wantedVolume) return { outcome: "mismatch" };

  return {
    outcome: "ok",
    item: {
      identity,
      pageUrl: page.url,
      priceAzn: product.priceAzn,
      oldPriceAzn: product.oldPriceAzn,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.kind === "marketplace" ? "marketplace" : "online_store",
      cashOnly: product.cashOnly === true,
      ...(source.kind === "marketplace"
        ? {
            sellerType: "individual" as const,
            sellerKey: adSellerKey(source.id, product.name, product.priceAzn, product.city ?? null),
          }
        : {}),
    },
  };
}
