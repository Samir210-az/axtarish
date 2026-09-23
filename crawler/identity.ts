import { createHash } from "node:crypto";
import { foldText, parseQuery, tokensOf } from "../lib/normalize";
import type { Authenticity, Variant } from "../lib/types";
import { decodeEntities, type ExtractedProduct } from "./jsonld";

export interface Identity {
  productId: string;
  matchKey: string;
  displayName: string;
  brand: string;
  model: string;
  category: string;
  variant: Variant | null;
  volumeMl: number | null;
  sizeLabel: string | null;
  gtin: string | null;
  authenticity: Authenticity;
}

const SIZE = /(?<![a-z0-9.])(\d{1,4}(?:[.,]\d+)?)\s*(ml|litr|lt|l|gr|qr|g|kq|kg|gb|tb)(?![a-z])/g;
const SKIP = /\b(tester|dekant|decant|miniatur|probnik|sample|set|dest|desti)\b/;
const REPLICA = /\b(dubai|dubay|dubaj|kopiya|kopya|copy|replika|replica|analoq|analog)\b|1:1/;

const NOISE = new Set([
  "original",
  "orijinal",
  "yeni",
  "new",
  "kisi",
  "kisiler",
  "qadin",
  "qadinlar",
  "men",
  "mens",
  "women",
  "woman",
  "man",
  "homme",
  "femme",
  "pour",
  "for",
  "ucun",
  "uchun",
  "by",
  "the",
  "and",
  "ve",
  "ile",
  "etir",
  "etri",
  "tualet",
  "suyu",
  "spray",
  "sprey",
  "gel",
]);

const COLORS = new Set([
  "black",
  "white",
  "blue",
  "green",
  "pink",
  "red",
  "gold",
  "silver",
  "gray",
  "grey",
  "purple",
  "yellow",
  "orange",
  "titanium",
  "natural",
  "desert",
  "midnight",
  "starlight",
  "qara",
  "ag",
  "mavi",
  "yasil",
  "qirmizi",
  "sari",
  "boz",
  "gumusu",
  "qizili",
  "bənovsəyi",
  "benovseyi",
  "cehrayi",
  "narinci",
]);

interface Size {
  key: string;
  ml: number | null;
  index: number;
  length: number;
}

function toSize(value: number, unit: string): { key: string; ml: number | null } | null {
  if (unit === "ml") return { key: `${value}ml`, ml: value };
  if (unit === "l" || unit === "lt" || unit === "litr") return { key: `${value * 1000}ml`, ml: value * 1000 };
  if (unit === "g" || unit === "gr" || unit === "qr") return value >= 10 ? { key: `${value}g`, ml: null } : null;
  if (unit === "kg" || unit === "kq") return { key: `${value * 1000}g`, ml: null };
  if (unit === "gb") return { key: `${value}gb`, ml: null };
  return { key: `${value * 1000}gb`, ml: null };
}

function firstSize(folded: string): Size | null {
  for (const match of folded.matchAll(SIZE)) {
    const value = Number((match[1] ?? "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    const size = toSize(value, match[2] as string);
    if (size) return { ...size, index: match.index ?? 0, length: match[0].length };
  }
  return null;
}

function inferCategory(folded: string, variant: Variant | null, parsed: string[]): string {
  if (parsed[0]) return parsed[0];
  if (variant !== null) return "perfume";
  if (/\b(iphone|smartfon|smartphone|galaxy|redmi|poco)\b/.test(folded)) return "smartphone";
  if (/\b(sabun|sampun|dus|kondisioner|mecunu|dezodorant|deodorant|krem)\b/.test(folded)) return "hygiene";
  return "other";
}

export function identify(product: ExtractedProduct): Identity | null {
  const displayName = decodeEntities(product.name).replace(/\s+/g, " ").trim();
  const folded = foldText(displayName);
  if (SKIP.test(folded)) return null;

  const size = firstSize(folded);
  const withoutSize = size ? `${folded.slice(0, size.index)} ${folded.slice(size.index + size.length)}` : folded;
  const parsed = parseQuery(withoutSize);
  const brand = product.brand ? decodeEntities(product.brand).trim() : "";
  const brandTokens = brand ? tokensOf(brand) : [];

  const keyTokens = [...new Set([...brandTokens, ...parsed.tokens])].filter(
    (token) => !NOISE.has(token) && !COLORS.has(token),
  );
  const modelTokens = parsed.tokens.filter((t) => !brandTokens.includes(t) && !NOISE.has(t) && !COLORS.has(t));
  if (keyTokens.length === 0 && !product.gtin) return null;

  const matchKey = product.gtin
    ? `gtin:${product.gtin}`
    : `${[...keyTokens].sort().join("-")}|${parsed.variant ?? "-"}|${size?.key ?? "-"}`;

  return {
    productId: `p${createHash("sha1").update(matchKey).digest("hex").slice(0, 20)}`,
    matchKey,
    displayName,
    brand: brand || (keyTokens[0] ?? ""),
    model: modelTokens.join(" "),
    category: inferCategory(folded, parsed.variant, parsed.categories),
    variant: parsed.variant,
    volumeMl: size?.ml ?? null,
    sizeLabel: size?.key ?? null,
    gtin: product.gtin,
    authenticity: REPLICA.test(folded) ? "replica" : "unknown",
  };
}
