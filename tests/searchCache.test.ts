import { describe, expect, it } from "vitest";
import { shouldSkipEnqueue } from "@/lib/searchQueue";
import { searchCacheKey } from "@/lib/searchCacheKey";
import { isQuotaError } from "@/lib/service";

describe("searchCacheKey", () => {
  it("eyni mənalı sorğular (böyük-kiçik hərf, söz sırası, ölçünün yazılışı) eyni açar verir", () => {
    expect(searchCacheKey("Dior Sauvage 100ml", 30)).toBe(searchCacheKey("sauvage DIOR 100 ml", 30));
    expect(searchCacheKey("Sabun", 30)).toBe(searchCacheKey("sabun", 30));
  });

  it("gün, sıralama, limit, həcm və fərqli sorğu açarı dəyişir", () => {
    const base = searchCacheKey("sabun", 30);
    expect(searchCacheKey("sabun", 90)).not.toBe(base);
    expect(searchCacheKey("sabun", 30, { sort: "price_asc" })).not.toBe(base);
    expect(searchCacheKey("sabun", 30, { limit: 24 })).not.toBe(base);
    expect(searchCacheKey("Dior Sauvage 100 ml", 30)).not.toBe(searchCacheKey("Dior Sauvage 60 ml", 30));
    expect(searchCacheKey("krem", 30)).not.toBe(base);
  });

  it("limit sərhədləri normallaşdırılır (defolt limit açıq yazılanla eyni)", () => {
    expect(searchCacheKey("sabun", 30, { limit: 12 })).toBe(searchCacheKey("sabun", 30));
    expect(searchCacheKey("sabun", 30, { limit: 9999 })).toBe(searchCacheKey("sabun", 30, { limit: 60 }));
  });
});

describe("isQuotaError", () => {
  it("Firestore kvota xətasını tanıyır", () => {
    expect(isQuotaError(Object.assign(new Error("boş"), { code: 8 }))).toBe(true);
    expect(isQuotaError(new Error("8 RESOURCE_EXHAUSTED: Quota exceeded."))).toBe(true);
  });

  it("digər xətaları kvota saymır", () => {
    expect(isQuotaError(new Error("network down"))).toBe(false);
    expect(isQuotaError(Object.assign(new Error("x"), { code: 5 }))).toBe(false);
    expect(isQuotaError("sətir")).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});

describe("shouldSkipEnqueue", () => {
  it("eyni açarı bir saat ərzində təkrar növbəyə yazmır, sonra yenə icazə verir", () => {
    const recent = new Map<string, number>();
    expect(shouldSkipEnqueue(recent, "a", 0)).toBe(false);
    expect(shouldSkipEnqueue(recent, "a", 30 * 60 * 1000)).toBe(true);
    expect(shouldSkipEnqueue(recent, "b", 30 * 60 * 1000)).toBe(false);
    expect(shouldSkipEnqueue(recent, "a", 61 * 60 * 1000)).toBe(false);
  });

  it("yaddaşı 500 açarla məhdudlaşdırır", () => {
    const recent = new Map<string, number>();
    for (let i = 0; i < 700; i += 1) shouldSkipEnqueue(recent, `k${i}`, 0);
    expect(recent.size).toBeLessThanOrEqual(500);
  });
});
