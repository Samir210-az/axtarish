import { PoliteFetcher } from "./http";

const URLS = ["https://bazarstore.az/search?q=sabun"];

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
  for (const url of URLS) {
    const page = await fetcher.get(url);
    if (!page.ok) {
      console.log(`${url}: ${page.reason} ${page.detail}`);
      continue;
    }
    const body = page.body;
    const items = [...body.matchAll(/class="product-item"/g)].length;
    console.log(`\n=== ${page.url} bytes=${body.length} product-item=${items}`);
    const first = body.indexOf('class="product-item"');
    console.log(`ilk kart:\n${body.slice(Math.max(0, first - 40), first + 2200).replace(/\s+/g, " ")}`);
    console.log(
      `\nendirim/köhnə qiymət nümunələri:\n  ${around(body, /old-price|price-old|discount/gi, 3, 260).join("\n  ---\n  ")}`,
    );
    console.log(`\npager:\n  ${around(body, /class="pager"|class="pagination"/gi, 1, 900).join("\n")}`);
    const pageLinks = [
      ...new Set([...body.matchAll(/href="([^"]*(?:pagenumber|page=)[^"]*)"/gi)].map((m) => m[1])),
    ].slice(0, 6);
    console.log(`\nsəhifə linkləri: ${JSON.stringify(pageLinks)}`);
    console.log(
      `\nnəticə sayı işarələri:\n  ${around(body, /nəticə|Nəticə|tapılmadı|N&#x259;tic|no-result/g, 3, 160).join("\n  ---\n  ")}`,
    );
    const bzdl = [...body.matchAll(/data-bzdl-item='([^']*)'/g)].slice(0, 3).map((m) => m[1]);
    console.log(`\nbzdl nümunə: ${JSON.stringify(bzdl)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
