import { describe, expect, it } from "vitest";
import { formatAzn, formatDay } from "@/lib/format";

describe("formatAzn", () => {
  it("tam məbləği kəsirsiz göstərir", () => {
    expect(formatAzn(232)).toBe("232\u00a0₼");
  });

  it("kəsri vergüllə, mində ayırıcını boşluqla göstərir", () => {
    expect(formatAzn(1849)).toBe("1\u00a0849\u00a0₼");
    expect(formatAzn(12.5)).toBe("12,50\u00a0₼");
    expect(formatAzn(1234567.89)).toBe("1\u00a0234\u00a0567,89\u00a0₼");
  });
});

describe("formatDay", () => {
  it("Bakı vaxtı ilə gün və Azərbaycan dilində ay adı verir", () => {
    expect(formatDay("2026-09-17T09:00:00.000Z")).toBe("17 sentyabr");
  });

  it("UTC-də gecə yarısından əvvəl olan an Bakıda növbəti günə keçir", () => {
    expect(formatDay("2026-09-30T21:30:00.000Z")).toBe("1 oktyabr");
    expect(formatDay("2026-12-31T20:00:00.000Z")).toBe("1 yanvar");
  });
});
