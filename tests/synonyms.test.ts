import { describe, expect, it } from "vitest";
import { identify } from "../crawler/identity";
import type { ExtractedProduct } from "../crawler/jsonld";
import { canonicalNameToken } from "../crawler/synonyms";

function nameKey(name: string, extra: Partial<ExtractedProduct> = {}): string | null {
  const found = identify({
    name,
    brand: null,
    sku: null,
    gtin: null,
    priceAzn: 1,
    oldPriceAzn: null,
    availability: "in_stock",
    origin: "jsonld",
    ...extra,
  });
  return found?.nameKey ?? null;
}

describe("canonicalNameToken", () => {
  it("sh yazılışını s-ə çevirir (uzun hərfli sözlərdə)", () => {
    expect(canonicalNameToken("absheron")).toBe("abseron");
    expect(canonicalNameToken("abseron")).toBe("abseron");
    expect(canonicalNameToken("ash")).toBe("ash");
    expect(canonicalNameToken("500")).toBe("500");
  });

  it("dəqiq sübutlu sinonimləri tətbiq edir", () => {
    expect(canonicalNameToken("serabi")).toBe("serab");
    expect(canonicalNameToken("dursou")).toBeNull();
    expect(canonicalNameToken("serab")).toBe("serab");
  });
});

describe("ad açarı: real mağaza cütləri birləşir", () => {
  it("Abşeron / Absheron zeytun yağı", () => {
    expect(nameKey("ABSERON ZEYTUN YAĞI 750 ML EXTRA VIRGIN")).toBe(nameKey("Absheron Extra Virgin Zeytun Yağı 0.75l"));
  });

  it("Şərabı / Şərab", () => {
    expect(nameKey("Ağsu Nar Şərabı 750ml")).toBe(nameKey("AGSU NAR ŞƏRAB 750 ML"));
  });

  it("Abrau-Dursou / Abrau şampan", () => {
    expect(nameKey("Abrau-dursou Şampan Brut Ağ 750ml")).toBe(nameKey("ABRAU SAMPAN 750 ML BRUT AG"));
  });
});

describe("ad açarı: fərqli məhsullar birləşmir", () => {
  it("fərqli marka və fərqli yaş", () => {
    expect(nameKey("ABRAU KONYAK 500 ML 5 ILLIK")).not.toBe(nameKey("Bakı Konyak 8 İllik 500 ml"));
    expect(nameKey("Atena Kərə Yağı 1kq")).not.toBe(nameKey("ALPINA KƏRƏ YAĞI 1 KQ 82.5%"));
  });

  it("fərqli ölçü və fərqli ətir", () => {
    expect(nameKey("ABSERON ZEYTUN YAĞI 750 ML EXTRA VIRGIN")).not.toBe(
      nameKey("ABSERON ZEYTUN YAĞI 250 ML EXTRA VIRGIN"),
    );
    expect(nameKey("Abc Yuyucu Toz 1.5 kq Lavanta")).not.toBe(nameKey("Abc Yuyucu Toz 1.5 kq Limon"));
  });

  it("təsvir sözü olan ilə olmayan (parfümlü) hələlik ayrı qalır", () => {
    expect(nameKey("Abc Krem Limon Parfümlü 750ml")).not.toBe(nameKey("ABC KREM 750 ML LİMON"));
  });
});
