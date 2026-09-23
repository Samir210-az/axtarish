import { describe, expect, it } from "vitest";
import { computeGroupStats, latestPerSeller, percentile, statsByAuthenticity } from "@/lib/stats";
import { daysAgo, offer } from "./fixtures";

describe("percentile", () => {
  it("xətti interpolyasiya edir", () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(percentile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    expect(percentile([10, 20, 30, 40, 50], 0.75)).toBe(40);
    expect(percentile([7], 0.75)).toBe(7);
  });

  it("boş siyahıda xəta atır", () => {
    expect(() => percentile([], 0.5)).toThrow(RangeError);
  });
});

describe("computeGroupStats", () => {
  it("boş siyahı üçün null qaytarır", () => {
    expect(computeGroupStats([])).toBeNull();
  });

  it("3-dən az satıcı varsa median göstərmir, yalnız qiymətləri verir", () => {
    const stats = computeGroupStats([offer({ priceAzn: 180 }), offer({ priceAzn: 90 })]);
    expect(stats).toMatchObject({ status: "insufficient", sellerCount: 2, prices: [90, 180] });
    expect(stats).not.toHaveProperty("median");
  });

  it("3 və daha çox satıcıda median, diapazon və mənbə bölgüsü hesablayır", () => {
    const stats = computeGroupStats([
      offer({ priceAzn: 100 }),
      offer({ priceAzn: 120, sourceType: "instagram", sellerType: "individual" }),
      offer({ priceAzn: 140 }),
      offer({ priceAzn: 300 }),
    ]);
    expect(stats).toMatchObject({
      status: "ok",
      sellerCount: 4,
      min: 100,
      max: 300,
      median: 130,
      p25: 115,
      p75: 180,
      sourceMix: { online_store: 3, instagram: 1 },
    });
  });

  it("eyni satıcının bir neçə elanını bir sayır və ən yenisini götürür", () => {
    const shared = { sellerKey: "same" };
    const result = latestPerSeller([
      offer({ ...shared, priceAzn: 200, effectiveAt: daysAgo(10) }),
      offer({ ...shared, priceAzn: 150, effectiveAt: daysAgo(2) }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.priceAzn).toBe(150);
  });

  it("son yenilənmə tarixini verir", () => {
    const stats = computeGroupStats([
      offer({ effectiveAt: daysAgo(9) }),
      offer({ effectiveAt: daysAgo(3) }),
      offer({ effectiveAt: daysAgo(5) }),
    ]);
    expect(stats?.updatedAt).toBe(daysAgo(3).toISOString());
  });
});

describe("statsByAuthenticity", () => {
  it("orijinal və replikanı ayrı qruplarda hesablayır", () => {
    const groups = statsByAuthenticity([
      offer({ authenticity: "original", priceAzn: 250 }),
      offer({ authenticity: "replica", priceAzn: 15 }),
      offer({ authenticity: "replica", priceAzn: 20 }),
    ]);
    expect(groups.map((g) => g.authenticity)).toEqual(["original", "replica"]);
    expect(groups[1]?.stats).toMatchObject({ status: "insufficient", prices: [15, 20] });
  });
});
