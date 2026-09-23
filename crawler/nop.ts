import { decodeEntities, parsePrice } from "./jsonld";

export function extractNopOldPrice(html: string): number | null {
  const match = /class="old-product-price"[^>]*>\s*<span>[^<]*<\/span>\s*<span>([^<]*)<\/span>/i.exec(html);
  return match ? parsePrice(decodeEntities(match[1] as string)) : null;
}
