import { describe, expect, it } from "vitest";
import { identify } from "../crawler/identity";
import type { ExtractedProduct } from "../crawler/jsonld";

const product = (name: string, extra: Partial<ExtractedProduct> = {}): ExtractedProduct => ({
  name,
  brand: null,
  sku: null,
  gtin: null,
  priceAzn: 100,
  oldPriceAzn: null,
  availability: "in_stock",
  origin: "jsonld",
  ...extra,
});

describe("identify", () => {
  it("parfüm adından variant, həcm və kateqoriyanı çıxarır", () => {
    const id = identify(product("Dior Sauvage Eau de Parfum 100 ml", { brand: "Dior" }));
    expect(id).toMatchObject({ variant: "edp", volumeMl: 100, category: "perfume", sizeLabel: "100ml" });
    expect(id?.matchKey).toBe("dior-sauvage|edp|100ml");
  });

  it("söz sırası və yazılış fərqi olsa da eyni məhsulu eyni açara gətirir", () => {
    const a = identify(product("Dior Sauvage Eau de Parfum 100 ml", { brand: "Dior" }));
    const b = identify(product("Sauvage EDP 100ML Dior", { brand: "Dior" }));
    const c = identify(product("Dior Savaj EDP 100 ml"));
    expect(b?.productId).toBe(a?.productId);
    expect(c?.productId).toBe(a?.productId);
  });

  it("fərqli həcm və ya variantı ayrı məhsul sayır", () => {
    const base = identify(product("Dior Sauvage EDP 100 ml", { brand: "Dior" }));
    expect(identify(product("Dior Sauvage EDP 60 ml", { brand: "Dior" }))?.productId).not.toBe(base?.productId);
    expect(identify(product("Dior Sauvage EDT 100 ml", { brand: "Dior" }))?.productId).not.toBe(base?.productId);
    expect(identify(product("Dior Sauvage Elixir 100 ml", { brand: "Dior" }))?.productId).not.toBe(base?.productId);
  });

  it("EAN varsa açar yalnız EAN-dır", () => {
    const a = identify(product("Bir ad", { gtin: "3348901486385" }));
    const b = identify(product("Tam fərqli ad", { gtin: "3348901486385" }));
    expect(a?.matchKey).toBe("gtin:3348901486385");
    expect(b?.productId).toBe(a?.productId);
  });

  it("tester, dekant və dəstləri atır", () => {
    expect(identify(product("Dior Sauvage Tester 100 ml"))).toBeNull();
    expect(identify(product("Dior Sauvage 10ml dekant"))).toBeNull();
    expect(identify(product("Dior Sauvage hədiyyə dəsti"))).toBeNull();
  });

  it("replika işarələrini tanıyır, əks halda naməlum saxlayır", () => {
    expect(identify(product("Sauvage Dubay versiya 100 ml"))?.authenticity).toBe("replica");
    expect(identify(product("Sauvage 1:1 kopiya 100 ml"))?.authenticity).toBe("replica");
    expect(identify(product("Dior Sauvage EDP 100 ml"))?.authenticity).toBe("unknown");
  });

  it("telefonda rəngi eyni sayır, yaddaşı ayırır", () => {
    const black = identify(product("Apple iPhone 15 128GB Black", { brand: "Apple" }));
    const blue = identify(product("Apple iPhone 15 128 GB Blue", { brand: "Apple" }));
    const big = identify(product("Apple iPhone 15 256GB Black", { brand: "Apple" }));
    expect(black?.productId).toBe(blue?.productId);
    expect(big?.productId).not.toBe(black?.productId);
    expect(black?.category).toBe("smartphone");
  });

  it("5G-ni yaddaş ölçüsü kimi oxumur", () => {
    const id = identify(product("Samsung Galaxy A55 5G 256GB", { brand: "Samsung" }));
    expect(id?.sizeLabel).toBe("256gb");
  });

  it("gigiyena məhsulunu və qram ölçüsünü tanıyır", () => {
    const id = identify(product("Dove Krem Sabun 90 qr"));
    expect(id).toMatchObject({ sizeLabel: "90g", category: "personal_care" });
  });

  it("litri millilitrə çevirir", () => {
    expect(identify(product("Fairy Yuyucu 1.5 l"))?.sizeLabel).toBe("1500ml");
  });

  it("adı yalnız ölçüdən ibarət olan məhsulu atır", () => {
    expect(identify(product("100 ml"))).toBeNull();
  });

  it("mağazanın adı olan markanı açara qatmır", () => {
    const opts = { storeNames: ["Omid", "omid"] };
    const a = identify(product("Burğu Sverlo 10x210", { brand: "Omid" }), opts);
    const b = identify(product("Burğu Sverlo 10x210"), opts);
    expect(a?.productId).toBe(b?.productId);
  });

  it("əsl markanı saxlayır", () => {
    const id = identify(product("Sauvage EDP 100 ml", { brand: "Dior" }), { storeNames: ["Omid"] });
    expect(id?.brand).toBe("Dior");
  });

  it("əl sabunu və gel kimi sözləri şəxsi baxım sayır", () => {
    expect(identify(product("MONOİ ƏL SABUNU 190ML"))?.category).toBe("personal_care");
    expect(identify(product("Üz Yuma Geli, 390 ml"))?.category).toBe("personal_care");
  });

  it("standart kateqoriya yalnız başqa siqnal olmadıqda tətbiq olunur", () => {
    expect(identify(product("Kirke Unisex 100 ml"), { defaultCategory: "perfume" })?.category).toBe("perfume");
    expect(identify(product("Dove Sabun 90 qr"), { defaultCategory: "perfume" })?.category).toBe("personal_care");
  });
});
