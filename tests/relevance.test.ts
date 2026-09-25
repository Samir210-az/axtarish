import { describe, expect, it } from "vitest";
import { indexProducts, parseQuery } from "@/lib/normalize";
import { rankCandidates, semanticScore } from "@/lib/relevance";
import { product } from "./fixtures";

describe("semanticScore", () => {
  it("embedding yoxdursa 0 qaytarır", () => {
    const indexed = indexProducts([product({ embedding: null })])[0]!;
    expect(semanticScore(indexed, [1, 0])).toBe(0);
    expect(semanticScore(indexed, null)).toBe(0);
  });

  it("iki oxşar embedding üçün müsbət qiymət qaytarır", () => {
    const indexed = indexProducts([product({ embedding: [1, 0] })])[0]!;
    expect(semanticScore(indexed, [1, 0])).toBeCloseTo(1);
  });
});

describe("rankCandidates ilə semantik tiebreaker", () => {
  it("açar-söz xalı bərabər olanda daha oxşar embedding-i yuxarı çıxarır", () => {
    const query = parseQuery("sauvage");
    const products = indexProducts([
      product({ id: "far", displayName: "Zzz Sauvage 100 ml", embedding: [0, 1] }),
      product({ id: "near", displayName: "Aaa Sauvage 100 ml", embedding: [1, 0] }),
    ]);
    const ranked = rankCandidates(products, query, [1, 0]);
    expect(ranked.map((p) => p.id)).toEqual(["near", "far"]);
  });

  it("açar-söz xalı fərqlidirsə, semantik oxşarlıq onu üstələmir", () => {
    const query = parseQuery("dior sauvage");
    const products = indexProducts([
      product({ id: "prefix-only", displayName: "Sauvage Body Wash", brand: "", embedding: [1, 0] }),
      product({ id: "exact", displayName: "Dior Sauvage EDP", embedding: [0, 1] }),
    ]);
    const ranked = rankCandidates(products, query, [1, 0]);
    expect(ranked[0]?.id).toBe("exact");
  });

  it("embedding verilmirsə (null) əvvəlki davranış dəyişmir", () => {
    const query = parseQuery("sauvage");
    const products = indexProducts([
      product({ id: "a", displayName: "Aaa Sauvage 100 ml" }),
      product({ id: "b", displayName: "Zzz Sauvage 100 ml" }),
    ]);
    const ranked = rankCandidates(products, query);
    expect(ranked.map((p) => p.id)).toEqual(["a", "b"]);
  });
});
