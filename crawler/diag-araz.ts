import { PoliteFetcher } from "./http";
import { collectProductUrls } from "./sitemap";

const ORIGIN = "https://arazmarket.az";

function snippets(body: string, pattern: RegExp, max: number): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(pattern)) {
    const at = m.index ?? 0;
    out.push(body.slice(Math.max(0, at - 120), at + 160).replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const fetcher = new PoliteFetcher();
  const declared = await fetcher.sitemapsFor(ORIGIN);
  console.log(`sitemaps: ${JSON.stringify(declared)}`);
  const start = declared.length > 0 ? declared : [`${ORIGIN}/sitemap.xml`];
  const entries = await collectProductUrls(fetcher, start, /./, { maxSitemaps: 5, maxUrls: 4000 });
  console.log(`ünvan sayı: ${entries.length}`);
  const groups = new Map<string, number>();
  for (const e of entries) {
    const seg = new URL(e.loc).pathname.split("/").filter(Boolean)[0] ?? "(kök)";
    groups.set(seg, (groups.get(seg) ?? 0) + 1);
  }
  console.log(`qruplar: ${JSON.stringify([...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12))}`);
  console.log(
    `nümunə: ${entries
      .slice(0, 12)
      .map((e) => e.loc)
      .join("\n  ")}`,
  );
  const soap = entries.filter((e) => /sabun|soap/i.test(decodeURIComponent(e.loc))).slice(0, 8);
  console.log(`sabun ünvanları (${soap.length}): ${soap.map((e) => e.loc).join("\n  ")}`);

  const target =
    soap[0]?.loc ?? entries.find((e) => new URL(e.loc).pathname.split("/").filter(Boolean).length >= 2)?.loc;
  if (!target) {
    console.log("məhsul səhifəsi seçilmədi");
    return;
  }
  const page = await fetcher.get(target);
  if (!page.ok) {
    console.log(`səhifə alınmadı: ${page.reason} ${page.detail}`);
    return;
  }
  const body = page.body;
  console.log(`\nSƏHİFƏ ${page.url} bytes=${body.length}`);
  const ld = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log(`ld+json bloklar: ${ld.length}`);
  ld.slice(0, 3).forEach((b, i) => console.log(`--- ld[${i}] ---\n${(b[1] ?? "").trim().slice(0, 1200)}`));
  const next = body.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  console.log(`__NEXT_DATA__: ${next ? `var, ${next[1]?.length} simvol` : "yoxdur"}`);
  if (next) console.log((next[1] ?? "").slice(0, 1800));
  console.log(
    `meta: ${[...body.matchAll(/<meta[^>]+(?:price|og:title|og:description)[^>]*>/gi)]
      .slice(0, 6)
      .map((m) => m[0])
      .join("\n")}`,
  );
  console.log(`qiymət parçaları:\n  ${snippets(body, /(₼|AZN|azn|"price"|price:)/g, 8).join("\n  ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
