import { decodeEntities, extractProduct, parsePrice, type ExtractedProduct } from "./jsonld";
import { sanitizeAdText } from "./sellers";

const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const AD = /^(.*?):\s*(\d[\d\s.,\u00a0]*?)\s*AZN\s*[—–-]\s*([^,|]+?),\s*Az[əe]rbaycan/i;

function priceOf(raw: string): number | null {
  const cleaned = raw.replace(/[\s\u00a0]/g, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) return parsePrice(cleaned.replace(/[.,]/g, ""));
  return parsePrice(cleaned);
}

export function extractTapAd(html: string, url: string): ExtractedProduct | null {
  const titleText = decodeEntities(TITLE.exec(html)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const fromTitle = AD.exec(titleText);
  const city = fromTitle ? (fromTitle[3] as string).trim() : null;
  const sku = /\/(\d+)\/?(?:[?#].*)?$/.exec(url)?.[1] ?? null;

  const structured = extractProduct(html);
  if (structured) {
    const name = sanitizeAdText(structured.name);
    if (!name) return null;
    return {
      name,
      brand: structured.brand,
      sku,
      gtin: null,
      priceAzn: structured.priceAzn,
      oldPriceAzn: null,
      availability: structured.availability,
      origin: "jsonld",
      city,
    };
  }

  if (!fromTitle) return null;
  const price = priceOf(fromTitle[2] as string);
  const name = sanitizeAdText(fromTitle[1] as string);
  if (price === null || !name) return null;
  return {
    name,
    brand: null,
    sku,
    gtin: null,
    priceAzn: price,
    oldPriceAzn: null,
    availability: "unknown",
    origin: "title",
    city,
  };
}
