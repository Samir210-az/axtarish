import { describe, expect, it } from "vitest";
import { PoliteFetcher } from "../crawler/http";
import { collectProductUrls, extractLinks, parseSitemapXml } from "../crawler/sitemap";
import { parseSitemaps } from "../crawler/robots";

type Route = { status?: number; body: string };

function harness(routes: Record<string, Route>, start = 1_000_000) {
  const calls: string[] = [];
  const sleeps: number[] = [];
  let clock = start;
  const fetcher = new PoliteFetcher({
    fetchImpl: (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      const route = routes[url];
      if (!route) return new Response("yox", { status: 404 });
      return new Response(route.body, { status: route.status ?? 200 });
    }) as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
  });
  return { fetcher, calls, sleeps };
}

describe("PoliteFetcher", () => {
  it("robots.txt qadağan etdiyi ünvana sorğu göndərmir", async () => {
    const { fetcher, calls } = harness({
      "https://a.az/robots.txt": { body: "User-agent: *\nDisallow: /private\n" },
      "https://a.az/private/x": { body: "gizli" },
    });
    const result = await fetcher.get("https://a.az/private/x");
    expect(result).toMatchObject({ ok: false, reason: "robots" });
    expect(calls).toEqual(["https://a.az/robots.txt"]);
  });

  it("icazəli ünvanı oxuyur", async () => {
    const { fetcher } = harness({
      "https://a.az/robots.txt": { body: "User-agent: *\nDisallow: /private\n" },
      "https://a.az/p/1": { body: "salam" },
    });
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: true, body: "salam", status: 200 });
  });

  it("robots.txt yoxdursa (404) hər şeyə icazə verir", async () => {
    const { fetcher } = harness({ "https://a.az/p/1": { body: "ok" } });
    expect((await fetcher.get("https://a.az/p/1")).ok).toBe(true);
  });

  it("403 gələndə saytı bağlayır və təkrar sorğu göndərmir", async () => {
    const { fetcher, calls } = harness({
      "https://a.az/robots.txt": { body: "User-agent: *\n" },
      "https://a.az/p/1": { status: 403, body: "Just a moment..." },
      "https://a.az/p/2": { body: "ok" },
    });
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: false, reason: "blocked" });
    expect(await fetcher.get("https://a.az/p/2")).toMatchObject({ ok: false, reason: "blocked" });
    expect(calls).toEqual(["https://a.az/robots.txt", "https://a.az/p/1"]);
  });

  it("robots.txt özü 403 verirsə saytı bloklu sayır", async () => {
    const { fetcher, calls } = harness({ "https://a.az/robots.txt": { status: 403, body: "Just a moment" } });
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: false, reason: "blocked" });
    expect(calls).toHaveLength(1);
  });

  it("robots.txt 5xx verirsə sayt bağlı sayılır", async () => {
    const { fetcher } = harness({ "https://a.az/robots.txt": { status: 502, body: "xəta" } });
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: false, reason: "host_closed" });
  });

  it("sorğular arasında ən azı 2.5 saniyə gözləyir", async () => {
    const { fetcher, sleeps } = harness({
      "https://a.az/robots.txt": { body: "User-agent: *\n" },
      "https://a.az/p/1": { body: "1" },
      "https://a.az/p/2": { body: "2" },
    });
    await fetcher.get("https://a.az/p/1");
    await fetcher.get("https://a.az/p/2");
    expect(sleeps.length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...sleeps)).toBeGreaterThan(0);
    expect(sleeps.every((ms) => ms <= 2500)).toBe(true);
  });

  it("Crawl-delay-ə uyğun gözləyir", async () => {
    const { fetcher, sleeps } = harness({
      "https://a.az/robots.txt": { body: "User-agent: *\nCrawl-delay: 30\n" },
      "https://a.az/p/1": { body: "1" },
    });
    await fetcher.get("https://a.az/p/1");
    expect(Math.max(...sleeps)).toBe(30_000);
  });

  it("http/https olmayan ünvanı rədd edir", async () => {
    const { fetcher } = harness({});
    expect(await fetcher.get("file:///etc/passwd")).toMatchObject({ ok: false });
    expect(await fetcher.get("bu ünvan deyil")).toMatchObject({ ok: false });
  });
});

describe("sitemap", () => {
  it("robots.txt-dən Sitemap sətirlərini oxuyur", () => {
    expect(parseSitemaps("User-agent: *\nSitemap: https://a.az/s1.xml\nsitemap: https://a.az/s2.xml\n")).toEqual([
      "https://a.az/s1.xml",
      "https://a.az/s2.xml",
    ]);
  });

  it("urlset-i lastmod və entity ilə oxuyur", () => {
    const xml = `<urlset><url><loc>https://a.az/p?a=1&amp;b=2</loc><lastmod>2026-09-01</lastmod></url><url><loc><![CDATA[https://a.az/p/2]]></loc></url></urlset>`;
    expect(parseSitemapXml(xml).urls).toEqual([
      { loc: "https://a.az/p?a=1&b=2", lastmod: "2026-09-01" },
      { loc: "https://a.az/p/2", lastmod: null },
    ]);
  });

  it("sitemapindex-in uşaqlarını qaytarır", () => {
    const xml = `<sitemapindex><sitemap><loc>https://a.az/a.xml</loc></sitemap><sitemap><loc>https://a.az/b.xml</loc></sitemap></sitemapindex>`;
    expect(parseSitemapXml(xml).children).toEqual(["https://a.az/a.xml", "https://a.az/b.xml"]);
  });

  it("məhsul ünvanlarını süzür, məhsul sitemap-ini önə çəkir, .gz-i atır", async () => {
    const { fetcher, calls } = harness({
      "https://a.az/robots.txt": { body: "User-agent: *\n" },
      "https://a.az/sitemap.xml": {
        body: `<sitemapindex><sitemap><loc>https://a.az/pages.xml</loc></sitemap><sitemap><loc>https://a.az/sitemap_products_1.xml</loc></sitemap><sitemap><loc>https://a.az/x.xml.gz</loc></sitemap></sitemapindex>`,
      },
      "https://a.az/sitemap_products_1.xml": {
        body: `<urlset><url><loc>https://a.az/products/a</loc></url><url><loc>https://a.az/collections/c</loc></url><url><loc>https://a.az/products/b</loc></url></urlset>`,
      },
      "https://a.az/pages.xml": { body: `<urlset><url><loc>https://a.az/pages/about</loc></url></urlset>` },
    });
    const found = await collectProductUrls(fetcher, ["https://a.az/sitemap.xml"], /\/products\//, {
      maxSitemaps: 6,
      maxUrls: 10,
    });
    expect(found.map((e) => e.loc)).toEqual(["https://a.az/products/a", "https://a.az/products/b"]);
    expect(calls.indexOf("https://a.az/sitemap_products_1.xml")).toBeLessThan(calls.indexOf("https://a.az/pages.xml"));
    expect(calls).not.toContain("https://a.az/x.xml.gz");
  });

  it("maxUrls həddini gözləyir", async () => {
    const urls = Array.from({ length: 5 }, (_, i) => `<url><loc>https://a.az/products/${i}</loc></url>`).join("");
    const { fetcher } = harness({
      "https://a.az/robots.txt": { body: "User-agent: *\n" },
      "https://a.az/sitemap.xml": { body: `<urlset>${urls}</urlset>` },
    });
    const found = await collectProductUrls(fetcher, ["https://a.az/sitemap.xml"], /products/, {
      maxSitemaps: 3,
      maxUrls: 2,
    });
    expect(found).toHaveLength(2);
  });

  it("ana səhifədən yalnız eyni saytın linklərini götürür", () => {
    const html = `<a href="/products/1">a</a><a href="https://a.az/products/2">b</a><a href="https://other.az/x">c</a><a href="#top">d</a><a href="/products/1">təkrar</a>`;
    expect(extractLinks(html, "https://a.az/").sort()).toEqual(["https://a.az/products/1", "https://a.az/products/2"]);
  });
});
