import { createHash } from "node:crypto";
import { PoliteFetcher } from "./http";
import { identify } from "./identity";
import { extractProduct } from "./jsonld";
import { collectProductUrls, extractLinks, type SitemapEntry } from "./sitemap";
import { SOURCES, type Source } from "./sources";
import type { SaveItem } from "./store";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const LIMIT = Math.max(1, Math.min(200, Number(arg("limit") ?? 30) || 30));
const ONLY = (arg("source") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DRY = process.argv.includes("--dry") || !process.env.FIREBASE_SERVICE_ACCOUNT;
const DAY = new Date().toISOString().slice(0, 10);

function rank(url: string): number {
  return parseInt(createHash("sha1").update(`${url}${DAY}`).digest("hex").slice(0, 8), 16);
}

async function discover(
  fetcher: PoliteFetcher,
  source: Source,
  pattern: RegExp,
): Promise<{ entries: SitemapEntry[]; note: string }> {
  const origin = new URL(source.url).origin;
  const declared = await fetcher.sitemapsFor(origin);
  const start = declared.length > 0 ? declared : [`${origin}/sitemap.xml`];
  const fromSitemap = await collectProductUrls(fetcher, start, pattern, { maxSitemaps: 6, maxUrls: 5000 });
  if (fromSitemap.length > 0) return { entries: fromSitemap, note: `sitemap (${start.length} başlanğıc)` };

  const home = await fetcher.get(source.url);
  if (!home.ok) return { entries: [], note: `ana səhifə alınmadı: ${home.reason} ${home.detail}` };
  const links = extractLinks(home.body, home.url).filter((u) => pattern.test(u));
  return { entries: links.map((loc) => ({ loc, lastmod: null })), note: "sitemap yoxdur, ana səhifə linkləri" };
}

async function processSource(source: Source): Promise<{ items: SaveItem[]; lines: string[] }> {
  const fetcher = new PoliteFetcher();
  const lines: string[] = [`\n## ${source.id} (${source.name})`];
  const pattern = new RegExp(source.productUrlPattern ?? "/products?/");
  const { entries, note } = await discover(fetcher, source, pattern);
  lines.push(`kəşf: ${note}, namizəd ünvan: ${entries.length}`);
  if (entries.length === 0) return { items: [], lines };

  const picked = [...entries].sort((a, b) => rank(a.loc) - rank(b.loc)).slice(0, LIMIT);
  const failures: Record<string, number> = {};
  const items: SaveItem[] = [];
  let noData = 0;
  let outOfStock = 0;
  let unidentified = 0;

  for (const entry of picked) {
    const page = await fetcher.get(entry.loc);
    if (!page.ok) {
      failures[page.reason] = (failures[page.reason] ?? 0) + 1;
      if (page.reason === "blocked" || page.reason === "host_closed") break;
      continue;
    }
    const product = extractProduct(page.body);
    if (!product) {
      noData += 1;
      continue;
    }
    if (product.availability === "out_of_stock") {
      outOfStock += 1;
      continue;
    }
    const identity = identify(product);
    if (!identity) {
      unidentified += 1;
      continue;
    }
    items.push({
      identity,
      pageUrl: page.url,
      priceAzn: product.priceAzn,
      oldPriceAzn: product.oldPriceAzn,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.kind === "marketplace" ? "marketplace" : "online_store",
    });
  }

  lines.push(
    `cəhd: ${picked.length}, çıxarıldı: ${items.length}, məlumat yoxdur: ${noData}, stokda yoxdur: ${outOfStock}, tanınmadı: ${unidentified}, uğursuz: ${JSON.stringify(failures)}`,
  );
  for (const item of items.slice(0, 6)) {
    const i = item.identity;
    lines.push(
      `- ${i.displayName} | açar=${i.matchKey} | ${item.priceAzn} ₼${item.oldPriceAzn ? ` (köhnə ${item.oldPriceAzn})` : ""} | ${i.category} | ${i.authenticity}`,
    );
  }
  return { items, lines };
}

async function main() {
  const selected = SOURCES.filter((s) => (ONLY.length > 0 ? ONLY.includes(s.id) : s.adapter === "generic-jsonld"));
  console.log(
    `# Crawl ${new Date().toISOString()} | limit=${LIMIT} | rejim=${DRY ? "DRY (bazaya yazılmır)" : "YAZMA"}`,
  );
  console.log(`saytlar: ${selected.map((s) => s.id).join(", ") || "yoxdur"}`);

  const all: SaveItem[] = [];
  for (const source of selected) {
    try {
      const { items, lines } = await processSource(source);
      lines.forEach((l) => console.log(l));
      all.push(...items);
    } catch (error) {
      console.log(`\n## ${source.id}\nXƏTA: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (DRY) {
    console.log(`\nDRY: ${all.length} qiymət hazırdır, bazaya yazılmadı.`);
    return;
  }
  if (all.length === 0) {
    console.log("\nYazılacaq qiymət yoxdur.");
    return;
  }
  const { saveItems } = await import("./store");
  console.log(`\nBaza: ${JSON.stringify(await saveItems(all))}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
