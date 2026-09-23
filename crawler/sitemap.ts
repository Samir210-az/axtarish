import type { PoliteFetcher } from "./http";

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

export interface ParsedSitemap {
  urls: SitemapEntry[];
  children: string[];
}

function decode(value: string): string {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function tag(block: string, name: string): string | null {
  const match = new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`, "i").exec(block);
  return match?.[1] ? decode(match[1]) : null;
}

export function parseSitemapXml(xml: string): ParsedSitemap {
  const result: ParsedSitemap = { urls: [], children: [] };
  if (/<sitemapindex/i.test(xml)) {
    for (const match of xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi)) {
      const loc = tag(match[1] ?? "", "loc");
      if (loc) result.children.push(loc);
    }
    return result;
  }
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const block = match[1] ?? "";
    const loc = tag(block, "loc");
    if (loc) result.urls.push({ loc, lastmod: tag(block, "lastmod") });
  }
  return result;
}

export async function collectProductUrls(
  fetcher: PoliteFetcher,
  start: string[],
  pattern: RegExp,
  options: { maxSitemaps: number; maxUrls: number },
): Promise<SitemapEntry[]> {
  const queue = [...start];
  const seen = new Set<string>();
  const found = new Map<string, SitemapEntry>();
  let fetched = 0;

  while (queue.length > 0 && fetched < options.maxSitemaps) {
    const next = queue.shift() as string;
    if (seen.has(next) || next.endsWith(".gz")) continue;
    seen.add(next);

    const response = await fetcher.get(next);
    fetched += 1;
    if (!response.ok) continue;

    const parsed = parseSitemapXml(response.body);
    const children = parsed.children.sort((a, b) => Number(/product/i.test(b)) - Number(/product/i.test(a)));
    queue.unshift(...children);
    for (const entry of parsed.urls) {
      if (found.size >= options.maxUrls) break;
      if (pattern.test(entry.loc)) found.set(entry.loc, entry);
    }
  }
  return [...found.values()];
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const links = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(decode(match[1] ?? ""), base);
      if (url.origin === base.origin) links.add(url.toString());
    } catch {
      continue;
    }
  }
  return [...links];
}
