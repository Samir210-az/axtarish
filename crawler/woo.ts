import { decodeEntities, parsePrice, type ExtractedProduct } from "./jsonld";

const TITLE = /<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i;
const AMOUNT = /<bdi>\s*([\d.,]+)(?:&nbsp;|\s|\u00a0)*<span[^>]*>\s*(?:AZN|₼)\s*<\/span>/gi;

function amounts(fragment: string): number[] {
  return [...fragment.matchAll(AMOUNT)].map((m) => parsePrice(m[1])).filter((value): value is number => value !== null);
}

function productNode(html: string): Record<string, unknown> | null {
  for (const block of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse((block[1] as string).trim());
    } catch {
      continue;
    }
    const stack: unknown[] = [data];
    while (stack.length > 0) {
      const node = stack.pop();
      if (Array.isArray(node)) stack.push(...node);
      else if (node && typeof node === "object") {
        const object = node as Record<string, unknown>;
        const type = object["@type"];
        if ((Array.isArray(type) ? type : [type]).includes("Product")) return object;
        stack.push(...Object.values(object));
      }
    }
  }
  return null;
}

function availabilityOf(html: string, node: Record<string, unknown> | null): ExtractedProduct["availability"] {
  const offers = node?.offers;
  const first = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown> | undefined;
  const text = typeof first?.availability === "string" ? first.availability : "";
  if (/OutOfStock|SoldOut|Discontinued/i.test(text) || /class="[^"]*\boutofstock\b/.test(html)) return "out_of_stock";
  if (/InStock|LimitedAvailability|PreOrder/i.test(text) || /class="[^"]*\binstock\b/.test(html)) return "in_stock";
  return "unknown";
}

export function extractWooProduct(html: string): ExtractedProduct | null {
  const title = TITLE.exec(html);
  if (!title) return null;
  const after = html.slice((title.index ?? 0) + title[0].length);
  const start = after.search(/<p[^>]*class="price"[^>]*>/i);
  if (start < 0) return null;
  const block = after.slice(start, start + 2000);
  const end = block.indexOf("</p>");
  const priceHtml = end > 0 ? block.slice(0, end) : block;

  const deleted = /<del[\s\S]*?<\/del>/i.exec(priceHtml)?.[0] ?? null;
  const inserted = /<ins[\s\S]*?<\/ins>/i.exec(priceHtml)?.[0] ?? null;
  const rest = deleted ? priceHtml.replace(deleted, "") : priceHtml;
  const currentList = amounts(inserted ?? rest);
  if (currentList.length !== 1) return null;
  const current = currentList[0] as number;
  const old = deleted ? (amounts(deleted)[0] ?? null) : null;

  const node = productNode(html);
  const nodeName = typeof node?.name === "string" ? node.name : null;
  const name = decodeEntities(nodeName ?? title[1]?.replace(/<[^>]+>/g, " ") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return null;
  const sku = node?.sku === undefined || node.sku === null || node.sku === "" ? null : String(node.sku);

  return {
    name,
    brand: null,
    sku,
    gtin: null,
    priceAzn: current,
    oldPriceAzn: old !== null && old > current ? old : null,
    availability: availabilityOf(html, node),
    origin: "woo",
  };
}
