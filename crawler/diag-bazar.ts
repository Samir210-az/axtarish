import { PoliteFetcher } from "./http";
import { collectProductUrls } from "./sitemap";
import { SOURCES } from "./sources";

function around(body: string, needle: RegExp, max: number, radius = 220): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(needle)) {
    const at = m.index ?? 0;
    out.push(body.slice(Math.max(0, at - radius), at + radius).replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const source = SOURCES.find((s) => s.id === "bazarstore");
  if (!source) throw new Error("bazarstore reyestrdə yoxdur");
  const origin = new URL(source.url).origin;
  const fetcher = new PoliteFetcher();
  const declared = await fetcher.sitemapsFor(origin);
  console.log(`origin=${origin} sitemaps=${JSON.stringify(declared)}`);
  const start = declared.length > 0 ? declared : [`${origin}/sitemap.xml`];
  const entries = await collectProductUrls(fetcher, start, /./, { maxSitemaps: 6, maxUrls: 4000 });
  console.log(`ünvan sayı: ${entries.length}`);
  const groups = new Map<string, number>();
  for (const e of entries) {
    const seg = new URL(e.loc).pathname.split("/").filter(Boolean)[0] ?? "(kök)";
    groups.set(seg, (groups.get(seg) ?? 0) + 1);
  }
  console.log(`qruplar: ${JSON.stringify([...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12))}`);
  console.log(
    `nümunə:\n  ${entries
      .slice(0, 10)
      .map((e) => e.loc)
      .join("\n  ")}`,
  );

  let target = entries.find((e) => /sabun|soap/i.test(decodeURIComponent(e.loc)))?.loc;
  let page = target ? await fetcher.get(target) : null;
  if (!page) {
    console.log("sitemap-dan sabun ünvanı yoxdur, ana səhifə linkləri sınanır");
    const home = await fetcher.get(source.url);
    if (!home.ok) {
      console.log(`ana səhifə: ${home.reason} ${home.detail}`);
      return;
    }
    const links = [...home.body.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1] as string);
    console.log(
      `ana səhifə linkləri (${links.length}), nümunə:\n  ${links
        .filter((l) => /product|mehsul|item|p\//i.test(l))
        .slice(0, 12)
        .join("\n  ")}`,
    );
    return;
  }
  if (!page.ok) {
    console.log(`səhifə alınmadı: ${page.reason} ${page.detail}`);
    return;
  }
  target = page.url;
  const body = page.body;
  console.log(`\nSƏHİFƏ ${target} bytes=${body.length}`);
  console.log(
    `çərçivə işarələri: ${JSON.stringify({
      next: /_next\//.test(body),
      nextF: /__next_f/.test(body),
      nuxt: /__NUXT__|_nuxt\//.test(body),
      woo: /woocommerce/i.test(body),
      shopify: /cdn\.shopify\.com/.test(body),
      opencart: /route=product/.test(body),
      bitrix: /bitrix/i.test(body),
    })}`,
  );
  const ld = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log(`ld+json bloklar: ${ld.length}`);
  ld.slice(0, 3).forEach((b, i) => console.log(`--- ld[${i}] ---\n${(b[1] ?? "").trim().slice(0, 1400)}`));
  console.log(
    `meta:\n${[...body.matchAll(/<meta[^>]+(?:price|og:title|og:description|product)[^>]*>/gi)]
      .slice(0, 8)
      .map((m) => m[0])
      .join("\n")}`,
  );
  console.log(`<h1>:\n  ${around(body, /<h1[^>]*>/g, 1, 260).join("\n")}`);
  console.log(`qiymət parçaları:\n  ${around(body, /(₼|AZN|azn|manat)/g, 6, 180).join("\n  ---\n  ")}`);
  const flat = body.replace(/\\"/g, '"');
  console.log(
    `JSON qiymət açarları:\n  ${around(flat, /"(price|sale_price|salePrice|regular_price|old_price|discount_price|priceAzn)"\s*:/gi, 4, 200).join("\n  ---\n  ")}`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
