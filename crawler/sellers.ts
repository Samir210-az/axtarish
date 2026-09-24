import { createHash } from "node:crypto";
import { tokensOf } from "../lib/normalize";

export function adSellerKey(sourceId: string, name: string, priceAzn: number, city: string | null): string {
  const canonical = `${sourceId}|${[...tokensOf(name)].sort().join(" ")}|${priceAzn}|${(city ?? "").toLowerCase()}`;
  return `ad:${createHash("sha1").update(canonical).digest("hex").slice(0, 16)}`;
}

const PHONE = /(?<!\d)(?:\+?994|0)[\s\-().]*\d{2}[\s\-().]*\d{3}[\s\-().]*\d{2}[\s\-().]*\d{2}(?!\d)/g;

export function sanitizeAdText(text: string): string {
  return text
    .replace(PHONE, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
