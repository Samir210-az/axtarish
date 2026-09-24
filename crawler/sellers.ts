import { createHash } from "node:crypto";
import { tokensOf } from "../lib/normalize";

export function adSellerKey(sourceId: string, name: string, priceAzn: number, city: string | null): string {
  const canonical = `${sourceId}|${[...tokensOf(name)].sort().join(" ")}|${priceAzn}|${(city ?? "").toLowerCase()}`;
  return `ad:${createHash("sha1").update(canonical).digest("hex").slice(0, 16)}`;
}
