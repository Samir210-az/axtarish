import { PoliteFetcher } from "./http";
import { urlMatchesQuery } from "./match";
import { collectProductUrls } from "./sitemap";
import { SOURCES } from "./sources";

function around(body: string, needle: RegExp, max: number, radius = 200): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(needle)) {
    const at = m.index ?? 0;
    out.push(body.slice(Math.max(0, at - radius), at + radius).replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const source = SOURCES.find((s) => s.id === "almali");
  if (!source) throw new Error("almali reyestrdə yoxdur");
  const fetcher = new PoliteFetcher();
  const origin = new URL(source.url).origin;
  const declared = await fetcher.sitemapsFor(origin);
  const pattern = new RegExp(source.productUrlPattern ?? "/products?/");
  const entries = await collectProductUrls(
    fetcher,
    declared.length > 0 ? declared : [`${origin}/sitemap.xml`],
    pattern,
    {
      maxSitemaps: 30,
      maxUrls: 60000,
    },
  );
  const matches = entries.filter(
    (e) => urlMatchesQuery(e.loc, "dior sauvage") || urlMatchesQuery(e.loc, "chanel bleu"),
  );
  console.log(
    `sitemaps=${JSON.stringify(declared)} ünvan=${entries.length} uyğun(dior sauvage|chanel bleu)=${matches.length}`,
  );
  console.log(
    matches
      .slice(0, 8)
      .map((m) => `  ${m.loc}`)
      .join("\n"),
  );
  const target = matches[0]?.loc ?? entries[0]?.loc;
  if (!target) return;

  const page = await fetcher.get(target);
  if (!page.ok) {
    console.log(`səhifə alınmadı: ${page.reason} ${page.detail}`);
    return;
  }
  const body = page.body;
  console.log(`\nSƏHİFƏ ${page.url} bytes=${body.length}`);
  console.log(
    `çərçivə: ${JSON.stringify({ next: /_next\//.test(body), woo: /woocommerce/i.test(body), shopify: /cdn\.shopify\.com/.test(body), nop: /nopcommerce/i.test(body), opencart: /route=product/.test(body), bitrix: /bitrix/i.test(body), laravel: /laravel|csrf-token/i.test(body), vue: /data-v-|__NUXT__|_nuxt/.test(body) })}`,
  );
  const ld = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log(`ld+json bloklar: ${ld.length}`);
  ld.slice(0, 3).forEach((b, i) => console.log(`--- ld[${i}] ---\n${(b[1] ?? "").trim().slice(0, 1800)}`));
  console.log(
    `meta:\n${[...body.matchAll(/<meta[^>]+(?:price|og:title|product:|og:price)[^>]*>/gi)]
      .slice(0, 8)
      .map((m) => m[0])
      .join("\n")}`,
  );
  console.log(`h1:\n  ${around(body, /<h1[^>]*>/g, 1, 220).join("\n")}`);
  console.log(`manat işarələri:\n  ${around(body, /(₼|AZN|azn|manat|&#8380;)/g, 6, 200).join("\n  ---\n  ")}`);
  console.log(
    `qiymət atributları:\n  ${around(body, /(data-payment|data-price|data-old-price|class="[^"]*price[^"]*")/gi, 8, 220).join("\n  ---\n  ")}`,
  );
  console.log(
    `stok:\n  ${around(body, /(in stock|out of stock|InStock|OutOfStock|stokda|Stokda)/g, 3, 140).join("\n  ---\n  ")}`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
