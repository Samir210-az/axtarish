export interface ExtractedProduct {
  name: string;
  brand: string | null;
  sku: string | null;
  gtin: string | null;
  priceAzn: number;
  oldPriceAzn: number | null;
  availability: "in_stock" | "out_of_stock" | "unknown";
  origin: "jsonld" | "og" | "next" | "woo";
}

type Json = Record<string, unknown>;

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function parsePrice(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) && input > 0 ? input : null;
  if (typeof input !== "string") return null;

  let text = input.replace(/[^\d.,\s\u00a0]/g, "").replace(/[\s\u00a0]/g, "");
  if (!text) return null;

  const hasDot = text.includes(".");
  const commas = (text.match(/,/g) ?? []).length;
  if (hasDot && commas > 0) {
    text =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (commas === 1 && /,\d{1,2}$/.test(text)) {
    text = text.replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typesOf(node: Json): string[] {
  return asArray(node["@type"]).filter((t): t is string => typeof t === "string");
}

function collectNodes(value: unknown, out: Json[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectNodes(item, out));
    return;
  }
  if (!isObject(value)) return;
  out.push(value);
  if (value["@graph"]) collectNodes(value["@graph"], out);
}

function text(value: unknown): string | null {
  if (typeof value === "string") return decodeEntities(value).trim() || null;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = text(item);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value) && typeof value.name === "string") return decodeEntities(value.name).trim() || null;
  return null;
}

function gtinOf(node: Json): string | null {
  for (const key of ["gtin", "gtin14", "gtin13", "gtin12", "gtin8", "ean"]) {
    const digits = String(node[key] ?? "").replace(/\D/g, "");
    if ([8, 12, 13, 14].includes(digits.length)) return digits;
  }
  return null;
}

function availabilityOf(value: unknown): ExtractedProduct["availability"] {
  const raw = typeof value === "string" ? value : "";
  if (/OutOfStock|SoldOut|Discontinued/i.test(raw)) return "out_of_stock";
  if (/InStock|LimitedAvailability|PreOrder|OnlineOnly/i.test(raw)) return "in_stock";
  return "unknown";
}

function currencyOk(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return true;
  return /^(AZN|₼|man|manat)$/i.test(value.trim());
}

function offerOf(
  node: Json,
): { price: number; old: number | null; availability: ExtractedProduct["availability"] } | null {
  for (const raw of asArray(node.offers)) {
    if (!isObject(raw)) continue;
    if (!currencyOk(raw.priceCurrency)) continue;
    const price = parsePrice(raw.price ?? raw.lowPrice);
    if (price === null) continue;

    let old: number | null = null;
    for (const spec of asArray(raw.priceSpecification)) {
      if (isObject(spec) && /list|strike|original/i.test(String(spec.priceType ?? ""))) {
        old = parsePrice(spec.price);
      }
    }
    return { price, old: old !== null && old > price ? old : null, availability: availabilityOf(raw.availability) };
  }
  return null;
}

function fromJsonLd(html: string): ExtractedProduct | null {
  const nodes: Json[] = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectNodes(JSON.parse((match[1] ?? "").trim()), nodes);
    } catch {
      continue;
    }
  }

  for (const node of nodes) {
    const types = typesOf(node);
    if (!types.some((t) => /^Product(Group)?$/.test(t))) continue;

    const variants = types.includes("ProductGroup") ? asArray(node.hasVariant).filter(isObject) : [];
    const candidates: Json[] = variants.length > 0 ? variants : [node];
    for (const candidate of candidates) {
      const offer = offerOf(candidate);
      const name = text(candidate.name) ?? text(node.name);
      if (!offer || !name) continue;
      return {
        name,
        brand: text(candidate.brand) ?? text(node.brand),
        sku: text(candidate.sku) ?? text(node.sku),
        gtin: gtinOf(candidate) ?? gtinOf(node),
        priceAzn: offer.price,
        oldPriceAzn: offer.old,
        availability: offer.availability,
        origin: "jsonld",
      };
    }
  }
  return null;
}

function meta(html: string, property: string): string | null {
  const escaped = property.replace(/[.:]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return decodeEntities(match[1]).trim();
  }
  return null;
}

function fromOpenGraph(html: string): ExtractedProduct | null {
  const price = parsePrice(meta(html, "product:price:amount") ?? meta(html, "og:price:amount"));
  const name = meta(html, "og:title");
  const currency = meta(html, "product:price:currency") ?? meta(html, "og:price:currency");
  if (price === null || !name || !currencyOk(currency)) return null;
  const old = parsePrice(meta(html, "product:original_price:amount"));
  return {
    name,
    brand: meta(html, "product:brand"),
    sku: null,
    gtin: null,
    priceAzn: price,
    oldPriceAzn: old !== null && old > price ? old : null,
    availability: "unknown",
    origin: "og",
  };
}

export function extractProduct(html: string): ExtractedProduct | null {
  return fromJsonLd(html) ?? fromOpenGraph(html);
}
