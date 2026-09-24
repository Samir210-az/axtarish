import { PoliteFetcher } from "./http";

const URLS = [
  "https://almali.az/product/christian-dior-sauvage-m-edp-100ml/",
  "https://almali.az/product/chanel-bleu-de-chanel-m-edp-50ml/",
];

function around(body: string, needle: RegExp, max: number, radius = 160): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(needle)) {
    const at = m.index ?? 0;
    out.push(body.slice(Math.max(0, at - radius), at + radius).replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const fetcher = new PoliteFetcher();
  for (const url of URLS) {
    const page = await fetcher.get(url);
    if (!page.ok) {
      console.log(`${url}: ${page.reason} ${page.detail}`);
      continue;
    }
    const body = page.body;
    const availability = [...body.matchAll(/"availability"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    console.log(`\n=== ${url}`);
    console.log(`JSON-LD availability: ${JSON.stringify(availability)}`);
    console.log(
      `outofstock sinfi sayı=${(body.match(/\boutofstock\b/g) ?? []).length}, instock=${(body.match(/\binstock\b/g) ?? []).length}`,
    );
    const main = /<div[^>]+id="product-\d+"[^>]*class="([^"]*)"|<div[^>]+class="([^"]*)"[^>]*id="product-\d+"/.exec(
      body,
    );
    console.log(`əsas məhsul konteyneri sinifləri: ${main?.[1] ?? main?.[2] ?? "tapılmadı"}`);
    console.log(`"stock" mətn blokları:\n  ${around(body, /class="[^"]*\bstock\b[^"]*"/g, 3).join("\n  ---\n  ")}`);
    console.log(`outofstock konteksti:\n  ${around(body, /\boutofstock\b/g, 3).join("\n  ---\n  ")}`);
    console.log(
      `sifariş düyməsi:\n  ${around(body, /single_add_to_cart_button|Səbətə əlavə et|Add to cart|Stokda yoxdur|Stokda var/gi, 3).join("\n  ---\n  ")}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
