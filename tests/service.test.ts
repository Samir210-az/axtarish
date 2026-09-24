import { describe, expect, it } from "vitest";
import { parseListOptions, validateSearchInput } from "@/lib/service";

describe("validateSearchInput", () => {
  it("defolt pəncərə 30 gündür", () => {
    expect(validateSearchInput("Dior", undefined)).toEqual({ ok: true, q: "Dior", days: 30 });
  });

  it("boşluqları kəsir", () => {
    expect(validateSearchInput("  iPhone 15  ", "7")).toEqual({ ok: true, q: "iPhone 15", days: 7 });
  });

  it("qısa və uzun sorğunu rədd edir", () => {
    expect(validateSearchInput("a", undefined).ok).toBe(false);
    expect(validateSearchInput("x".repeat(81), undefined).ok).toBe(false);
  });

  it("icazə verilməyən müddəti rədd edir", () => {
    expect(validateSearchInput("Dior", "365").ok).toBe(false);
    expect(validateSearchInput("Dior", "abc").ok).toBe(false);
  });
});

describe("parseListOptions", () => {
  it("defolt sıralama və 12 məhsul verir", () => {
    expect(parseListOptions(undefined, undefined)).toEqual({ sort: "sellers", limit: 12 });
  });

  it("yalnız icazəli sıralamanı qəbul edir", () => {
    expect(parseListOptions("price_asc", undefined).sort).toBe("price_asc");
    expect(parseListOptions("discount", null).sort).toBe("discount");
    expect(parseListOptions("hack", undefined).sort).toBe("sellers");
  });

  it("göstərilən sayı 12 ilə 60 arasında saxlayır", () => {
    expect(parseListOptions(undefined, "24").limit).toBe(24);
    expect(parseListOptions(undefined, "5").limit).toBe(12);
    expect(parseListOptions(undefined, "9999").limit).toBe(60);
    expect(parseListOptions(undefined, "abc").limit).toBe(12);
    expect(parseListOptions(undefined, "24.5").limit).toBe(12);
  });
});
