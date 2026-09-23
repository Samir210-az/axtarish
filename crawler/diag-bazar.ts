import { PoliteFetcher } from "./http";

function around(body: string, needle: RegExp, max: number, radius = 300): string[] {
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

  const cat = await fetcher.get("https://bazarstore.az/paltar-sabunu");
  if (cat.ok) {
    const body = cat.body;
    const first = body.indexOf('class="product-item"');
    console.log(`=== KATEQORİYA ${cat.url} kartlar=${[...body.matchAll(/class="product-item"/g)].length}`);
    console.log(`ilk kart:\n${body.slice(Math.max(0, first - 40), first + 2000).replace(/\s+/g, " ")}`);
    console.log(
      `\nköhnə/endirim:\n  ${around(body, /old-price|price-old|discount-price|actual-price/gi, 3, 240).join("\n  ---\n  ")}`,
    );
    console.log(
      `\npager:\n  ${around(body, /class="pager"|class="pagination"|pagenumber|next-page/gi, 2, 500).join("\n  ---\n  ")}`,
    );
  } else {
    console.log(`kateqoriya: ${cat.reason} ${cat.detail}`);
  }

  const prod = await fetcher.get("https://bazarstore.az/alafran-teserrufat-sabunu-800-q-2");
  if (prod.ok) {
    const body = prod.body;
    console.log(`\n=== MƏHSUL ${prod.url} bytes=${body.length}`);
    const ld = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    console.log(`ld+json bloklar: ${ld.length}`);
    ld.slice(0, 2).forEach((b, i) => console.log(`--- ld[${i}] ---\n${(b[1] ?? "").trim().slice(0, 1200)}`));
    console.log(
      `meta:\n${[...body.matchAll(/<meta[^>]+(?:price|og:title|product:)[^>]*>/gi)]
        .slice(0, 6)
        .map((m) => m[0])
        .join("\n")}`,
    );
    console.log(`h1:\n  ${around(body, /<h1[^>]*>/g, 1, 200).join("\n")}`);
    console.log(
      `qiymət blokları:\n  ${around(body, /product-price|actual-price|prices|price-value/gi, 3, 300).join("\n  ---\n  ")}`,
    );
    console.log(
      `bzdl (məhsul səhifəsi):\n  ${[...body.matchAll(/data-bzdl-item='([^']*)'/g)]
        .slice(0, 2)
        .map((m) => m[1])
        .join("\n  ")}`,
    );
    console.log(`stok:\n  ${around(body, /stock|in-stock|out-of-stock|availability/gi, 3, 160).join("\n  ---\n  ")}`);
  } else {
    console.log(`məhsul: ${prod.reason} ${prod.detail}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
