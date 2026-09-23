import { createHash } from "node:crypto";
import { PoliteFetcher } from "./http";
import { identify } from "./identity";
import { extractProduct } from "./jsonld";
import { extractArazProduct } from "./nextRsc";
import { extractNopOldPrice } from "./nop";
import { hasWordSlug, querySpec, textMatchesQuery, urlMatchesQuery } from "./match";
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
const QUERIES = (arg("query") ?? "")
  .split("|")
  .map((s) => s.trim())
  .filter(Boolean);
const USE_QUEUE = process.argv.includes("--queue");
const QUERY_MATCH_LIMIT = 25;
const QUERY_SLUGLESS_LIMIT = 15;
const DAY = new Date().toISOString().slice(0, 10);

const CATEGORY_HINT: Record<string, string> = { parfüm: "perfume", elektronika: "electronics" };

function defaultCategoryOf(source: Source): string | undefined {
  return source.categories.length === 1 ? CATEGORY_HINT[source.categories[0] as string] : undefined;
}

function rank(url: string): number {
  return parseInt(createHash("sha1").update(`${url}${DAY}`).digest("hex").slice(0, 8), 16);
}

const discovered = new Map<string, Promise<{ entries: SitemapEntry[]; note: string }>>();

function discover(
  fetcher: PoliteFetcher,
  source: Source,
  pattern: RegExp,
): Promise<{ entries: SitemapEntry[]; note: string }> {
  const cached = discovered.get(source.id);
  if (cached) return cached;
  const fresh = discoverFresh(fetcher, source, pattern);
  discovered.set(source.id, fresh);
  return fresh;
}

async function discoverFresh(
  fetcher: PoliteFetcher,
  source: Source,
  pattern: RegExp,
): Promise<{ entries: SitemapEntry[]; note: string }> {
  const origin = new URL(source.url).origin;
  const declared = await fetcher.sitemapsFor(origin);
  const start = declared.length > 0 ? declared : [`${origin}/sitemap.xml`];
  const fromSitemap = await collectProductUrls(fetcher, start, pattern, { maxSitemaps: 30, maxUrls: 60000 });
  if (fromSitemap.length > 0) return { entries: fromSitemap, note: `sitemap (${start.length} başlanğıc)` };

  const home = await fetcher.get(source.url);
  if (!home.ok) return { entries: [], note: `ana səhifə alınmadı: ${home.reason} ${home.detail}` };
  const links = extractLinks(home.body, home.url).filter((u) => pattern.test(u));
  return { entries: links.map((loc) => ({ loc, lastmod: null })), note: "sitemap yoxdur, ana səhifə linkləri" };
}

async function processSource(
  source: Source,
  fetcher: PoliteFetcher,
  query?: string,
): Promise<{ items: SaveItem[]; lines: string[] }> {
  const lines: string[] = [`\n## ${source.id} (${source.name})${query ? ` | sorğu: ${query}` : ""}`];
  const pattern = new RegExp(source.productUrlPattern ?? "/products?/");
  const { entries, note } = await discover(fetcher, source, pattern);
  lines.push(`kəşf: ${note}, namizəd ünvan: ${entries.length}`);
  if (entries.length === 0) return { items: [], lines };

  let picked: SitemapEntry[];
  if (query) {
    const matched = entries.filter((e) => urlMatchesQuery(e.loc, query));
    const matchedSet = new Set(matched.map((e) => e.loc));
    const slugless = entries.filter((e) => !matchedSet.has(e.loc) && !hasWordSlug(e.loc));
    const useSlugless = matched.length === 0 && slugless.length >= entries.length * 0.4;
    picked = [...matched.slice(0, QUERY_MATCH_LIMIT), ...(useSlugless ? slugless.slice(0, QUERY_SLUGLESS_LIMIT) : [])];
    lines.push(`ünvan uyğunluğu: ${matched.length}, sluqsuz ünvan: ${slugless.length}, yoxlanacaq: ${picked.length}`);
  } else {
    picked = [...entries].sort((a, b) => rank(a.loc) - rank(b.loc)).slice(0, LIMIT);
  }
  const wantedVolume = query ? querySpec(query).volumeMl : null;
  let mismatch = 0;
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
    const product = source.adapter === "araz-rsc" ? extractArazProduct(page.body, page.url) : extractProduct(page.body);
    if (!product) {
      noData += 1;
      continue;
    }
    if (source.adapter === "generic-jsonld" && product.oldPriceAzn === null) {
      const oldPrice = extractNopOldPrice(page.body);
      if (oldPrice !== null && oldPrice > product.priceAzn) product.oldPriceAzn = oldPrice;
    }
    if (product.availability === "out_of_stock") {
      outOfStock += 1;
      continue;
    }
    if (query && !textMatchesQuery(`${product.brand ?? ""} ${product.name}`, query)) {
      mismatch += 1;
      continue;
    }
    const identity = identify(product, {
      storeNames: [source.name, new URL(source.url).hostname.split(".")[0] ?? ""],
      defaultCategory: defaultCategoryOf(source),
    });
    if (!identity) {
      unidentified += 1;
      continue;
    }
    if (wantedVolume !== null && identity.volumeMl !== wantedVolume) {
      mismatch += 1;
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
    `cəhd: ${picked.length}, çıxarıldı: ${items.length}, məlumat yoxdur: ${noData}, stokda yoxdur: ${outOfStock}, tanınmadı: ${unidentified}, sorğuya uyğun deyil: ${mismatch}, uğursuz: ${JSON.stringify(failures)}`,
  );
  for (const item of items.slice(0, 6)) {
    const i = item.identity;
    lines.push(
      `- ${i.displayName} | açar=${i.matchKey} | ${item.priceAzn} ₼${item.oldPriceAzn ? ` (köhnə ${item.oldPriceAzn})` : ""} | ${i.category} | ${i.authenticity}`,
    );
  }
  return { items, lines };
}

async function inspect(url: string) {
  const fetcher = new PoliteFetcher();
  const page = await fetcher.get(url);
  if (!page.ok) {
    console.log(`inspect ${url}: ${page.reason} ${page.detail}`);
    return;
  }
  console.log(`inspect ${page.url} status=${page.status} bytes=${page.body.length}`);
  const blocks = [...page.body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log(`ld+json bloklar: ${blocks.length}`);
  blocks
    .slice(0, 4)
    .forEach((block, index) => console.log(`--- ld[${index}] ---\n${(block[1] ?? "").trim().slice(0, 1500)}`));
  const metas = [...page.body.matchAll(/<meta[^>]+(?:price|og:title)[^>]*>/gi)].slice(0, 8).map((m) => m[0]);
  console.log(`meta:\n${metas.join("\n")}`);
  console.log(`extractProduct: ${JSON.stringify(extractProduct(page.body))}`);
}

async function main() {
  const inspectUrl = arg("inspect");
  if (inspectUrl) {
    await inspect(inspectUrl);
    return;
  }
  const selected = SOURCES.filter((s) => (ONLY.length > 0 ? ONLY.includes(s.id) : s.adapter !== undefined));
  console.log(
    `# Crawl ${new Date().toISOString()} | limit=${LIMIT} | rejim=${DRY ? "DRY (bazaya yazılmır)" : "YAZMA"}`,
  );
  console.log(`saytlar: ${selected.map((s) => s.id).join(", ") || "yoxdur"}`);

  const fetchers = new Map<string, PoliteFetcher>();
  const fetcherOf = (source: Source): PoliteFetcher => {
    let fetcher = fetchers.get(source.id);
    if (!fetcher) {
      fetcher = new PoliteFetcher();
      fetchers.set(source.id, fetcher);
    }
    return fetcher;
  };

  const all: SaveItem[] = [];
  const run = async (source: Source, query?: string): Promise<number> => {
    try {
      const { items, lines } = await processSource(source, fetcherOf(source), query);
      lines.forEach((l) => console.log(l));
      all.push(...items);
      return items.length;
    } catch (error) {
      console.log(`\n## ${source.id}\nXƏTA: ${error instanceof Error ? error.message : error}`);
      return 0;
    }
  };

  const queries: { id?: string; text: string }[] = QUERIES.map((text) => ({ text }));
  if (queries.length === 0) {
    for (const source of selected) await run(source);
    if (USE_QUEUE && !DRY) {
      const { takePending } = await import("./queue");
      const pending = await takePending(3);
      console.log(`\nnövbə: ${pending.length} sorğu`);
      queries.push(...pending.map((p) => ({ id: p.id, text: p.query })));
    }
  }

  const processed: { id?: string; found: number }[] = [];
  for (const q of queries) {
    console.log(`\n### Sorğu: "${q.text}"`);
    if (querySpec(q.text).tokens.length === 0) {
      console.log("məhsul adı yoxdur (yalnız kateqoriya və ya həcm), keçildi");
      processed.push({ id: q.id, found: 0 });
      continue;
    }
    let found = 0;
    for (const source of selected) found += await run(source, q.text);
    processed.push({ id: q.id, found });
  }

  const unique = [...new Map(all.map((item) => [`${item.sourceId}|${item.pageUrl}`, item])).values()];
  if (DRY) {
    console.log(`\nDRY: ${unique.length} qiymət hazırdır, bazaya yazılmadı.`);
    return;
  }
  if (unique.length === 0) {
    console.log("\nYazılacaq qiymət yoxdur.");
  } else {
    const { saveItems } = await import("./store");
    console.log(`\nBaza: ${JSON.stringify(await saveItems(unique))}`);
  }
  const withIds = processed.filter((p) => p.id);
  if (withIds.length > 0) {
    const { markDone } = await import("./queue");
    for (const p of withIds) await markDone(p.id as string, p.found);
    console.log(`növbə: ${withIds.length} sorğu tamamlandı`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
