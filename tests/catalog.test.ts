import { describe, expect, it } from "vitest";
import { entryIndex, nextCursor } from "../crawler/catalog";

describe("catalog kursoru", () => {
  it("siyahının sonuna çatanda əvvələ sarılır", () => {
    expect(entryIndex(8, 0, 10)).toBe(8);
    expect(entryIndex(8, 2, 10)).toBe(0);
    expect(entryIndex(8, 5, 10)).toBe(3);
  });

  it("növbəti kursoru yalnız işlənmiş say qədər irəli aparır", () => {
    expect(nextCursor(0, 100, 14752)).toBe(100);
    expect(nextCursor(14700, 100, 14752)).toBe(48);
    expect(nextCursor(5, 0, 10)).toBe(5);
  });

  it("boş siyahıda 0 qaytarır", () => {
    expect(entryIndex(3, 1, 0)).toBe(0);
    expect(nextCursor(3, 1, 0)).toBe(0);
  });
});
