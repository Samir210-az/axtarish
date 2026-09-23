import { describe, expect, it } from "vitest";
import { search, toPublicOffer, type SearchDeps } from "@/lib/search";
import type { Offer, Product } from "@/lib/types";
import { NOW, daysAgo, offer, product } from "./fixtures";

function deps(products: Product[], offers: Offer[]): SearchDeps {
  return {
    loadProducts: async () => products,
    loadOffers: async (ids) => offers.filter((o) => ids.includes(o.productId)),
    now: () => NOW,
  };
}

describe("search", () => {
  it("anlaşılmayan sorğuda understood=false qaytarır", async () => {
    const res = await search("100 ml", 30, deps([product()], []));
    expect(res).toMatchObject({ understood: false, matchedProducts: 0, results: [] });
  });

  it("bazada olmayan məhsul üçün boş nəticə verir", async () => {
    const res = await search("Chanel Bleu", 30, deps([product()], []));
    expect(res).toMatchObject({ understood: true, matchedProducts: 0, results: [] });
  });

  it("məhsul var, amma pəncərədə qiymət yoxdursa matchedProducts>0, results boş", async () => {
    const old = offer({ effectiveAt: daysAgo(45) });
    const res = await search("Dior Sauvage", 30, deps([product()], [old]));
    expect(res.matchedProducts).toBe(1);
    expect(res.results).toEqual([]);
  });

  it("pəncərəni parametrə görə tətbiq edir", async () => {
    const old = offer({ effectiveAt: daysAgo(45) });
    const wide = await search("Dior Sauvage", 90, deps([product()], [old]));
    expect(wide.results).toHaveLength(1);
    const narrow = await search("Dior Sauvage", 30, deps([product()], [old]));
    expect(narrow.results).toHaveLength(0);
  });

  it("gələcək tarixli qeydi nəzərə almır", async () => {
    const future = offer({ effectiveAt: new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000) });
    const res = await search("Dior Sauvage", 30, deps([product()], [future]));
    expect(res.results).toEqual([]);
  });

  it("qiymətə görə artan sıralayır və qrupları ayırır", async () => {
    const offers = [
      offer({ priceAzn: 300 }),
      offer({ priceAzn: 250 }),
      offer({ priceAzn: 280 }),
      offer({ priceAzn: 20, authenticity: "replica" }),
    ];
    const res = await search("Dior Sauvage EDP 100 ml", 30, deps([product()], offers));
    const [first] = res.results;
    expect(first?.offers.map((o) => o.priceAzn)).toEqual([20, 250, 280, 300]);
    expect(first?.groups.map((g) => g.authenticity)).toEqual(["original", "replica"]);
  });

  it("satıcı sayı çox olan məhsulu yuxarı çıxarır", async () => {
    const products = [
      product({ id: "a", displayName: "Aaa Sauvage 100 ml" }),
      product({ id: "b", displayName: "Zzz Sauvage 100 ml" }),
    ];
    const offers = [offer({ productId: "a" }), offer({ productId: "b" }), offer({ productId: "b" })];
    const res = await search("Sauvage", 30, deps(products, offers));
    expect(res.results.map((r) => r.productId)).toEqual(["b", "a"]);
  });
});

describe("toPublicOffer", () => {
  it("fərdi satıcının adını və linkini gizlədir", () => {
    const result = toPublicOffer(
      offer({
        sellerType: "individual",
        sellerName: "gizli_hesab",
        sellerUrl: "https://instagram.com/gizli_hesab",
        sourceType: "instagram",
      }),
    );
    expect(result.seller).toBeNull();
    expect(result.sellerUrl).toBeNull();
    expect(JSON.stringify(result)).not.toContain("gizli_hesab");
  });

  it("mağaza üçün ad və təhlükəsiz linki saxlayır", () => {
    const result = toPublicOffer(offer({ sellerName: "Parfum House", sellerUrl: "https://parfumhouse.az/p/1" }));
    expect(result.seller).toBe("Parfum House");
    expect(result.sellerUrl).toBe("https://parfumhouse.az/p/1");
  });

  it("http/https olmayan linki atır", () => {
    expect(toPublicOffer(offer({ sellerUrl: "javascript:alert(1)" })).sellerUrl).toBeNull();
    expect(toPublicOffer(offer({ sellerUrl: "https://user:pass@evil.example" })).sellerUrl).toBeNull();
  });

  it("endirim faizini hesablayır, köhnə qiymət daha aşağıdırsa endirim göstərmir", () => {
    expect(toPublicOffer(offer({ priceAzn: 85, oldPriceAzn: 100 })).discountPct).toBe(15);
    expect(toPublicOffer(offer({ priceAzn: 100, oldPriceAzn: 90 }))).toMatchObject({
      discountPct: null,
      oldPriceAzn: null,
    });
  });
});
