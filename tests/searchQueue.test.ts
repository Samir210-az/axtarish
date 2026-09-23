import { describe, expect, it } from "vitest";
import { needsMoreData, queueKey } from "@/lib/searchQueue";
import type { GroupStats, ProductResult, SearchResponse } from "@/lib/types";

function response(overrides: Partial<SearchResponse> = {}): SearchResponse {
  return {
    windowDays: 30,
    understood: true,
    matchedProducts: 0,
    results: [],
    generatedAt: "2026-09-24T00:00:00Z",
    ...overrides,
  };
}

function result(stats: GroupStats): ProductResult {
  return {
    productId: "p",
    name: "Məhsul",
    variant: null,
    volumeMl: null,
    groups: [{ authenticity: "unknown", stats }],
    offers: [],
    offersTruncated: false,
  };
}

const thin: GroupStats = {
  status: "insufficient",
  sellerCount: 1,
  prices: [10],
  sourceMix: {},
  updatedAt: "2026-09-24T00:00:00Z",
};
const full: GroupStats = {
  status: "ok",
  sellerCount: 4,
  min: 1,
  max: 9,
  median: 5,
  p25: 3,
  p75: 7,
  sourceMix: {},
  updatedAt: "2026-09-24T00:00:00Z",
};

describe("queueKey", () => {
  it("söz sırası və boşluqdan asılı olmayaraq eyni açar verir", () => {
    expect(queueKey("Dior Sauvage 100ml")).toBe(queueKey("sauvage  DIOR 100 ml"));
  });

  it("fərqli həcm və ya variant üçün fərqli açar verir", () => {
    expect(queueKey("Dior Sauvage 100 ml")).not.toBe(queueKey("Dior Sauvage 60 ml"));
    expect(queueKey("Dior Sauvage EDP")).not.toBe(queueKey("Dior Sauvage EDT"));
  });

  it("yararsız sorğuları rədd edir", () => {
    expect(queueKey("Parfüm")).toBeNull();
    expect(queueKey("100 ml")).toBeNull();
    expect(queueKey("a b c d e f g h")).toBeNull();
    expect(queueKey("x".repeat(40))).toBeNull();
    expect(queueKey("123 456")).toBeNull();
  });
});

describe("needsMoreData", () => {
  it("nəticə yoxdursa və ya median yoxdursa növbəyə yazmağı tələb edir", () => {
    expect(needsMoreData(response())).toBe(true);
    expect(needsMoreData(response({ results: [result(thin)] }))).toBe(true);
  });

  it("median hesablanıbsa və ya sorğu anlaşılmayıbsa tələb etmir", () => {
    expect(needsMoreData(response({ results: [result(full)] }))).toBe(false);
    expect(needsMoreData(response({ understood: false }))).toBe(false);
  });
});
