import { PoliteFetcher } from "./http";

const URL_TO_TEST = "https://www.arazmarket.az/az/products/usaq-sabunu-90qr-133";

function around(body: string, needle: string | RegExp, max: number, radius = 260): string[] {
  const out: string[] = [];
  const re = typeof needle === "string" ? new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g") : needle;
  for (const m of body.matchAll(re)) {
    const at = m.index ?? 0;
    out.push(body.slice(Math.max(0, at - radius), at + radius).replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const fetcher = new PoliteFetcher();
  const page = await fetcher.get(URL_TO_TEST);
  if (!page.ok) {
    console.log(`alınmadı: ${page.reason} ${page.detail}`);
    return;
  }
  const raw = page.body;
  const flat = raw.replace(/\\"/g, '"').replace(/\\u0026/g, "&");
  console.log(`bytes=${raw.length} flat=${flat.length}`);
  console.log(`h1: ${around(raw, /<h1[^>]*>/g, 2, 200).join("\n  ")}`);
  console.log(`\n<del> ətrafı:\n  ${around(raw, "<del>", 2, 500).join("\n  ---\n  ")}`);
  console.log(
    `\nqiymət açarları (flat):\n  ${around(flat, /"(price|salePrice|discountPrice|priceAzn|currentPrice|finalPrice|old_price|oldPrice)"\s*:/gi, 6, 200).join("\n  ---\n  ")}`,
  );
  console.log(`\nməhsul adı ətrafı (flat):\n  ${around(flat, "Uşaq sabunu 90qr", 4, 300).join("\n  ---\n  ")}`);
  console.log(
    `\nstok/sku açarları:\n  ${around(flat, /"(sku|barcode|ean|gtin|inStock|in_stock|stock|quantity|available)"\s*:/gi, 5, 120).join("\n  ---\n  ")}`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
