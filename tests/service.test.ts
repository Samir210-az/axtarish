import { describe, expect, it } from "vitest";
import { validateSearchInput } from "@/lib/service";

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
