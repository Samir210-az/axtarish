import { describe, expect, it } from "vitest";
import { MAX_CANDIDATE_PRODUCTS } from "@/lib/config";
import { search, type SearchDeps } from "@/lib/search";
import type { Offer, Product } from "@/lib/types";
import { NOW, offer, product } from "./fixtures";

function deps(products: Product[], offers: Offer[]): SearchDeps {
  return {
    loadProducts: async () => products,
    loadOffers: async (ids) => offers.filter((o) => ids.includes(o.productId)),
    now: () => NOW,
  };
}

function soap(id: string, displayName: string): Product {
  return product({
    id,
    displayName,
    brand: "",
    model: "",
    category: "personal_care",
    variant: null,
    volumeMl: null,
    aliases: [],
  });
}

describe("axtarış: sıralama, say və limit", () => {
  it("dəqiq söz uyğunluğu prefiks uyğunluğundan əvvəl gəlir", async () => {
    const products = [soap("dish", "Sabunqabı Xrom"), soap("bar", "Dove Sabun 90 qr")];
    const offers = [offer({ productId: "dish", priceAzn: 5 }), offer({ productId: "bar", priceAzn: 2 })];
    const res = await search("sabun", 30, deps(products, offers));
    expect(res.results.map((r) => r.productId)).toEqual(["bar", "dish"]);
  });

  it("ucuzdan bahaya və bahadan ucuza sıralayır", async () => {
    const products = [soap("a", "Sabun Alfa"), soap("b", "Sabun Beta"), soap("c", "Sabun Gama")];
    const offers = [
      offer({ productId: "a", priceAzn: 3 }),
      offer({ productId: "b", priceAzn: 1 }),
      offer({ productId: "c", priceAzn: 2 }),
    ];
    const asc = await search("sabun", 30, deps(products, offers), { sort: "price_asc" });
    expect(asc.results.map((r) => r.productId)).toEqual(["b", "c", "a"]);
    const desc = await search("sabun", 30, deps(products, offers), { sort: "price_desc" });
    expect(desc.results.map((r) => r.productId)).toEqual(["a", "c", "b"]);
    expect(desc.sort).toBe("price_desc");
  });

  it("endirimə görə sıralayır, endirimsizlər sonda qalır", async () => {
    const products = [soap("a", "Sabun Alfa"), soap("b", "Sabun Beta"), soap("c", "Sabun Gama")];
    const offers = [
      offer({ productId: "a", priceAzn: 90, oldPriceAzn: null }),
      offer({ productId: "b", priceAzn: 50, oldPriceAzn: 100 }),
      offer({ productId: "c", priceAzn: 80, oldPriceAzn: 100 }),
    ];
    const res = await search("sabun", 30, deps(products, offers), { sort: "discount" });
    expect(res.results.map((r) => r.productId)).toEqual(["b", "c", "a"]);
    expect(res.results[0]?.maxDiscountPct).toBe(50);
    expect(res.results[2]?.maxDiscountPct).toBeNull();
  });

  it("çox mağazası olan məhsulu əvvələ qoyur", async () => {
    const products = [soap("one", "Sabun Bir"), soap("two", "Sabun İki")];
    const offers = [
      offer({ productId: "one", priceAzn: 1 }),
      offer({ productId: "two", priceAzn: 5 }),
      offer({ productId: "two", priceAzn: 6 }),
    ];
    const res = await search("sabun", 30, deps(products, offers));
    expect(res.results.map((r) => r.productId)).toEqual(["two", "one"]);
    expect(res.results[0]).toMatchObject({ sellerCount: 2, minPriceAzn: 5, maxPriceAzn: 6 });
    expect(res.results[0]?.sellerOffers.map((o) => o.priceAzn)).toEqual([5, 6]);
  });

  it("limit və ümumi sayı ayrı verir", async () => {
    const products = Array.from({ length: 15 }, (_, i) => soap(`p${i}`, `Sabun Marka ${i}`));
    const offers = products.map((p, i) => offer({ productId: p.id, priceAzn: i + 1 }));
    const first = await search("sabun", 30, deps(products, offers));
    expect(first.results).toHaveLength(12);
    expect(first).toMatchObject({ matchedProducts: 15, pricedProducts: 15, examinedProducts: 15 });
    const more = await search("sabun", 30, deps(products, offers), { limit: 24 });
    expect(more.results).toHaveLength(15);
    const capped = await search("sabun", 30, deps(products, offers), { limit: 9999 });
    expect(capped.results).toHaveLength(15);
  });

  it("qiyməti olmayan uyğun məhsul ümumi sayda görünür, nəticədə yox", async () => {
    const products = [soap("a", "Sabun Alfa"), soap("b", "Sabun Beta")];
    const res = await search("sabun", 30, deps(products, [offer({ productId: "a", priceAzn: 1 })]));
    expect(res).toMatchObject({ matchedProducts: 2, pricedProducts: 1 });
  });

  it("yoxlanan namizəd sayını MAX_CANDIDATE_PRODUCTS ilə məhdudlaşdırır", async () => {
    const products = Array.from({ length: MAX_CANDIDATE_PRODUCTS + 10 }, (_, i) => soap(`p${i}`, `Sabun Marka ${i}`));
    const res = await search("sabun", 30, deps(products, []));
    expect(res.matchedProducts).toBe(MAX_CANDIDATE_PRODUCTS + 10);
    expect(res.examinedProducts).toBe(MAX_CANDIDATE_PRODUCTS);
  });
});
