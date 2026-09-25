import { describe, expect, it } from "vitest";
import { indexProducts, matchProducts, parseQuery } from "@/lib/normalize";
import { KEY_MAX, keysForToken, pickQueryKey, planProductQuery, searchKeysFor } from "@/lib/searchKeys";
import type { Product } from "@/lib/types";

function make(id: string, displayName: string, extra: Partial<Product> = {}): Product {
  return {
    id,
    displayName,
    brand: "",
    model: "",
    category: "other",
    variant: null,
    volumeMl: null,
    aliases: [displayName],
    embedding: null,
    ...extra,
  };
}

const PRODUCTS: Product[] = [
  make("p1", "Christian Dior Sauvage EDP 100 ml", {
    brand: "Christian Dior",
    model: "Sauvage",
    category: "perfume",
    variant: "edp",
    volumeMl: 100,
  }),
  make("p2", "Uşaq Sabunu 90qr"),
  make("p3", "FLOSOFT F017 MAYE SABUN QABI XROM 350 ML"),
  make("p4", "Apple iPhone 15 128 GB Black", { category: "smartphone" }),
  make("p5", "Al-Ko Güc Adapteri 12V"),
  make("p6", "Antidisestablishmentarianism Cleaner"),
];

const QUERIES = [
  "sabun",
  "usaq sabun",
  "Uşaq sabunu",
  "sauvage",
  "Dior Sauvage 100 ml",
  "savaj dior",
  "christian",
  "iphone 15",
  "ayfon 15",
  "128 gb",
  "al",
  "12v",
  "flosoft f017",
  "adapter",
  "antidisestablishmentarianism",
];

describe("keysForToken", () => {
  it("hərfli sözün 3-dən KEY_MAX-a qədər prefikslərini verir", () => {
    expect(keysForToken("sabunu")).toEqual(["sab", "sabu", "sabun", "sabunu"]);
    expect(keysForToken("christian")).toEqual(["chr", "chri", "chris", "christ", "christi", "christia"]);
    expect(keysForToken("christian").at(-1)).toHaveLength(KEY_MAX);
  });

  it("rəqəmləri və qısa sözləri bütöv saxlayır", () => {
    expect(keysForToken("15")).toEqual(["15"]);
    expect(keysForToken("128")).toEqual(["128"]);
    expect(keysForToken("al")).toEqual(["al"]);
    expect(keysForToken("1000019397")).toEqual(["10000193"]);
  });
});

describe("pickQueryKey və planProductQuery", () => {
  it("ən uzun sözü seçir və KEY_MAX ilə kəsir", () => {
    expect(pickQueryKey(["dior", "sauvage"])).toBe("sauvage");
    expect(pickQueryKey(["antidisestablishmentarianism"])).toBe("antidise");
    expect(pickQueryKey([])).toBeNull();
  });

  it("ad tokeni yoxdursa kateqoriyaya, o da yoxdursa null-a düşür", () => {
    expect(planProductQuery(parseQuery("Parfüm"))).toEqual({ kind: "category", categories: ["perfume"] });
    expect(planProductQuery(parseQuery("Dior Sauvage"))).toEqual({ kind: "key", key: "sauvage" });
    expect(planProductQuery(parseQuery("100 ml"))).toBeNull();
  });
});

describe("invariant: axtarış uyğunluq tapırsa, seçilən açar məhsulun açarları arasında olmalıdır", () => {
  const indexed = indexProducts(PRODUCTS);

  for (const raw of QUERIES) {
    it(`sorğu: ${raw}`, () => {
      const query = parseQuery(raw);
      const key = pickQueryKey(query.tokens);
      if (!key) return;
      const matched = matchProducts(indexed, query);
      for (const product of matched) {
        const keys = searchKeysFor(product);
        expect(keys, `${product.displayName} üçün açar "${key}" yoxdur`).toContain(key);
      }
    });
  }

  it("ən azı bir sorğu real uyğunluq tapır (test boş keçməsin)", () => {
    const total = QUERIES.map((q) => matchProducts(indexed, parseQuery(q)).length).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(8);
  });
});
