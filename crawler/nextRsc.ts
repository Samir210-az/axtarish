import { parsePrice, type ExtractedProduct } from "./jsonld";

const PRODUCT_OBJECT =
  /"id":\d+,"title":"([^"]*)","avg_rating":[\d.]+,"slug":"([^"]+)","description":(?:null|"[^"]*"),"barcode":(?:null|"([^"]*)"),"nutritional_value":(?:null|"[^"]*"),"sales_price":"([\d.]+)","discount_price":"([\d.]+)","is_discount":(true|false)/g;

function slugOf(pageUrl: string): string | null {
  try {
    const last = new URL(pageUrl).pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

function decodeTitle(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw;
  }
}

export function extractArazProduct(html: string, pageUrl: string): ExtractedProduct | null {
  const slug = slugOf(pageUrl);
  if (!slug) return null;

  const payload = html.replace(/\\"/g, '"').replace(/\\u0026/g, "&");
  for (const match of payload.matchAll(PRODUCT_OBJECT)) {
    if (match[2] !== slug) continue;
    const regular = parsePrice(match[4]);
    const discounted = parsePrice(match[5]);
    if (regular === null || discounted === null) return null;
    const onSale = match[6] === "true";
    return {
      name: decodeTitle(match[1] as string),
      brand: null,
      sku: match[3] ?? null,
      gtin: null,
      priceAzn: onSale ? discounted : regular,
      oldPriceAzn: onSale && regular > discounted ? regular : null,
      availability: "unknown",
      origin: "next",
    };
  }
  return null;
}
