import { identify } from "./identity";
import { extractProduct } from "./jsonld";
import { querySpec, textMatchesQuery } from "./match";
import { extractArazProduct } from "./nextRsc";
import { extractNopOldPrice } from "./nop";
import { extractWooProduct } from "./woo";
import type { Source } from "./sources";
import type { SaveItem } from "./store";

export type PageOutcome = "ok" | "noData" | "outOfStock" | "unidentified" | "mismatch";

const CATEGORY_HINT: Record<string, string> = { parfüm: "perfume", elektronika: "electronics" };

export function defaultCategoryOf(source: Source): string | undefined {
  return source.categories.length === 1 ? CATEGORY_HINT[source.categories[0] as string] : undefined;
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
        : extractProduct(page.body);
  if (!product) return { outcome: "noData" };
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
    },
  };
}
