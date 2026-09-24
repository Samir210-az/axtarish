import { describe, expect, it } from "vitest";
import { evaluatePage } from "../crawler/evaluate";
import { PoliteFetcher } from "../crawler/http";
import { sanitizeAdText } from "../crawler/sellers";
import { collectProductUrls } from "../crawler/sitemap";
import { SOURCES } from "../crawler/sources";
import { extractTapAd } from "../crawler/tap";

// Fikstürlər Termux sınağının çıxışına (başlıq formatı, JSON-LD tipləri, qiymət 650.00 AZN) uyğun qurulub, real HTML deyil.
const URL_ = "https://tap.az/elanlar/elektronika/telefonlar/48744274";
const TITLE = "Apple iPhone 14 Midnight 128GB/4GB: 650 AZN — Sumqayıt, Azərbaycan | 48744274 — Tap.Az";
const LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "Apple iPhone 14 Midnight 128GB/4GB",
      brand: { "@type": "Brand", name: "Apple" },
      offers: {
        "@type": "Offer",
        price: "650.00",
        priceCurrency: "AZN",
        availability: "https://schema.org/InStock",
        seller: { "@type": "Person", name: "Gizli Satıcı", telephone: "+994551234567" },
      },
    },
    { "@type": "Person", name: "Gizli Satıcı", telephone: "+994551234567" },
    { "@type": "BreadcrumbList", itemListElement: [] },
  ],
});
const page = (title = TITLE, ld: string | null = LD): string =>
  `<html><head><title>${title}</title>${ld ? `<script type="application/ld+json">${ld}</script>` : ""}</head><body>Əlaqə: 055 123 45 67</body></html>`;

describe("extractTapAd", () => {
  it("JSON-LD-dən ad, marka və qiyməti, başlıqdan şəhəri, ünvandan nömrəni oxuyur", () => {
    expect(extractTapAd(page(), URL_)).toEqual({
      name: "Apple iPhone 14 Midnight 128GB/4GB",
      brand: "Apple",
      sku: "48744274",
      gtin: null,
      priceAzn: 650,
      oldPriceAzn: null,
      availability: "in_stock",
      origin: "jsonld",
      city: "Sumqayıt",
    });
  });

  it("satıcının adı və telefonu nəticəyə düşmür", () => {
    const text = JSON.stringify(extractTapAd(page(), URL_));
    expect(text).not.toContain("Gizli");
    expect(text).not.toContain("+994");
    expect(text).not.toContain("055 123");
  });

  it("JSON-LD yoxdursa başlıqdan oxuyur", () => {
    expect(
      extractTapAd(page("Paltaryuyan LG: 60 AZN — Bakı, Azərbaycan | 48744333 — Tap.Az", null), URL_),
    ).toMatchObject({
      name: "Paltaryuyan LG",
      priceAzn: 60,
      city: "Bakı",
      origin: "title",
    });
  });

  it("adın içindəki telefon nömrəsini silir", () => {
    const ld = JSON.stringify({
      "@type": "Product",
      name: "Samsung A54 256GB 055 123 45 67",
      offers: { "@type": "Offer", price: "500.00", priceCurrency: "AZN" },
    });
    expect(extractTapAd(page(TITLE, ld), URL_)?.name).toBe("Samsung A54 256GB");
  });

  it("qiymət və ya başlıq yoxdursa null qaytarır", () => {
    expect(extractTapAd(page("Tap.az - Elanlar", null), URL_)).toBeNull();
    expect(extractTapAd("<html></html>", URL_)).toBeNull();
  });
});

describe("sanitizeAdText", () => {
  it.each([
    ["iPhone 14 055 123 45 67", "iPhone 14"],
    ["iPhone 14 (0501234567)", "iPhone 14"],
    ["iPhone 14 +994 55 123 45 67 təcili", "iPhone 14 təcili"],
    ["iPhone 14 994551234567", "iPhone 14"],
  ])("nömrəni silir: %s", (input, output) => {
    expect(sanitizeAdText(input)).toBe(output);
  });

  it.each(["Samsung A54 256 GB 8 GB", "iPhone 14 128GB/4GB", "Divan 2 500 AZN 3 nəfərlik", "Kabel 3.5 mm 1.5 m"])(
    "adi mətni dəyişmir: %s",
    (text) => {
      expect(sanitizeAdText(text)).toBe(text);
    },
  );
});

describe("sitemap siyasəti və ölçü həddi", () => {
  function harness(routes: Record<string, string>) {
    const calls: string[] = [];
    const fetcher = new PoliteFetcher({
      fetchImpl: (async (input: string | URL | Request) => {
        const url = String(input);
        calls.push(url);
        const body = routes[url];
        return body === undefined ? new Response("yox", { status: 404 }) : new Response(body, { status: 200 });
      }) as typeof fetch,
      sleep: async () => undefined,
      now: () => 0,
    });
    return { fetcher, calls };
  }
  const urlset = (n: number) =>
    `<urlset><url><loc>https://tap.az/elanlar/elektronika/telefonlar/${n}</loc></url></urlset>`;
  const index = `<sitemapindex>${[1, 2, 3, 4, 5].map((n) => `<sitemap><loc>https://tap.az/c${n}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
  const routes = {
    "https://tap.az/robots.txt": "User-agent: *\nDisallow: /auth/\n",
    "https://tap.az/sitemap.xml": index,
    "https://tap.az/suggestions.xml": urlset(999),
    ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`https://tap.az/c${n}.xml`, urlset(n)])),
  };

  it("yalnız son N alt-faylı və yalnız uyğun başlanğıc sitemap-ı oxuyur", async () => {
    const { fetcher, calls } = harness(routes);
    const entries = await collectProductUrls(
      fetcher,
      ["https://tap.az/sitemap.xml", "https://tap.az/suggestions.xml"],
      /\/elanlar\//,
      { maxSitemaps: 30, maxUrls: 1000, startOnly: /\/sitemap\.xml$/, lastChildren: 2 },
    );
    expect(entries.map((e) => e.loc.split("/").pop())).toEqual(["4", "5"]);
    expect(calls.some((c) => c.endsWith("suggestions.xml"))).toBe(false);
    expect(calls.some((c) => c.endsWith("c1.xml") || c.endsWith("c3.xml"))).toBe(false);
  });

  it("3 milyon simvoldan böyük sitemap kəsilmir", async () => {
    const big = `<urlset>${"<url><loc>https://tap.az/elanlar/a/b/1</loc></url>".repeat(1)}</urlset>${" ".repeat(3_500_000)}<!--son-->`;
    const { fetcher } = harness({ "https://tap.az/robots.txt": "User-agent: *\n", "https://tap.az/big.xml": big });
    const res = await fetcher.get("https://tap.az/big.xml");
    expect(res.ok && res.body.length).toBeGreaterThan(3_500_000);
    expect(res.ok && res.body.endsWith("<!--son-->")).toBe(true);
  });
});

describe("tap reyestrdə", () => {
  const source = SOURCES.find((s) => s.id === "tap");
  if (!source) throw new Error("tap yoxdur");

  it("yalnız Azərbaycan maşınından, gecə kataloquna daxil deyil", () => {
    expect(source).toMatchObject({ kind: "marketplace", adapter: "tap-jsonld", azOnly: true, catalog: false });
    expect(source.sitemapPolicy).toEqual({ startOnly: "/sitemap\\.xml$", lastChildren: 3 });
  });

  it("elan fərdi satıcı və marketplace kimi saxlanılır", () => {
    const result = evaluatePage(source, { url: URL_, body: page() });
    expect(result.outcome).toBe("ok");
    expect(result.item).toMatchObject({ sellerType: "individual", sourceType: "marketplace", priceAzn: 650 });
    expect(result.item?.sellerKey).toMatch(/^ad:/);
  });
});
