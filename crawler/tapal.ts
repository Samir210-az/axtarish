import { decodeEntities, parsePrice, type ExtractedProduct } from "./jsonld";

const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const AD = /^(.*?)\s+-\s+(\d[\d\s.,\u00a0]*?)\s*AZN\s*\|\s*([^|]+?)\s*-\s*TapAl\.az\s*$/i;

function priceOf(raw: string): number | null {
  const cleaned = raw.replace(/[\s\u00a0]/g, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) return parsePrice(cleaned.replace(/[.,]/g, ""));
  return parsePrice(cleaned);
}

function availabilityOf(html: string): ExtractedProduct["availability"] {
  const text = /"availability"\s*:\s*"([^"]+)"/.exec(html)?.[1] ?? "";
  if (/OutOfStock|SoldOut|Discontinued/i.test(text)) return "out_of_stock";
  return /InStock/i.test(text) ? "in_stock" : "unknown";
}

export function extractTapalAd(html: string, url: string): ExtractedProduct | null {
  const title = TITLE.exec(html);
  if (!title) return null;
  const text = decodeEntities(title[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const match = AD.exec(text);
  if (!match) return null;

  const price = priceOf(match[2] as string);
  const name = (match[1] as string).trim();
  if (price === null || !name) return null;

  return {
    name,
    brand: null,
    sku: /\/elan\/(\d+)-/.exec(url)?.[1] ?? null,
    gtin: null,
    priceAzn: price,
    oldPriceAzn: null,
    availability: availabilityOf(html),
    origin: "title",
    city: (match[3] as string).trim(),
  };
}
