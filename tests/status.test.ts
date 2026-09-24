import { describe, expect, it } from "vitest";
import { cycleNights, statusForFailure, statusForOutcome } from "../crawler/status";
import { offerDocSchema } from "../lib/schemas";

describe("crawler/status", () => {
  it("yalnız 404 və 410-u silinmiş sayır, blok və server xətalarını yox", () => {
    expect(statusForFailure("http", "HTTP 404")).toBe("gone");
    expect(statusForFailure("http", "HTTP 410")).toBe("gone");
    expect(statusForFailure("http", "HTTP 500")).toBeNull();
    expect(statusForFailure("http", "HTTP 4040")).toBeNull();
    expect(statusForFailure("blocked", "HTTP 403")).toBeNull();
    expect(statusForFailure("network", "HTTP 404")).toBeNull();
    expect(statusForFailure("robots", "robots.txt qadağan edir")).toBeNull();
  });

  it("stokda olmayan nəticəni ayrıca status kimi verir", () => {
    expect(statusForOutcome("outOfStock")).toBe("out_of_stock");
    expect(statusForOutcome("ok")).toBeNull();
    expect(statusForOutcome("noData")).toBeNull();
  });

  it("tam dövr uzunluğunu gecə ilə hesablayır", () => {
    expect(cycleNights(14752, 800)).toBe(19);
    expect(cycleNights(100, 100)).toBe(1);
    expect(cycleNights(100, 0)).toBeNull();
  });
});

describe("offer sənədinin status sahəsi", () => {
  const base = {
    productId: "p1",
    priceAzn: 1.5,
    sourceType: "online_store",
    sellerType: "store",
    sellerKey: "store:x",
    effectiveAt: { toDate: () => new Date() },
  };

  it("köhnə sənədlərdə (status yoxdur) aktiv sayılır", () => {
    expect(offerDocSchema.parse(base).status).toBe("active");
  });

  it("gone və out_of_stock qəbul olunur, naməlum status rədd edilir", () => {
    expect(offerDocSchema.parse({ ...base, status: "gone" }).status).toBe("gone");
    expect(offerDocSchema.parse({ ...base, status: "out_of_stock" }).status).toBe("out_of_stock");
    expect(offerDocSchema.safeParse({ ...base, status: "deleted" }).success).toBe(false);
  });
});
