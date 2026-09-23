import { describe, expect, it } from "vitest";
import { foldText, indexProducts, matchProducts, parseQuery } from "@/lib/normalize";
import { product } from "./fixtures";

describe("foldText", () => {
  it("Azərbaycan hərflərini latın əsasına gətirir", () => {
    expect(foldText("ƏŞĞÇÖÜ İı")).toBe("esgcou ii");
  });

  it("kirill hərflərini transliterasiya edir", () => {
    expect(foldText("Диор Саваж")).toBe("dior savaj");
  });
});

describe("parseQuery", () => {
  it("məhsul, həcm və variantı ayırır", () => {
    expect(parseQuery("Dior Sauvage EDT 100ml")).toEqual({
      tokens: ["dior", "sauvage"],
      volumeMl: 100,
      variant: "edt",
      categories: [],
    });
  });

  it("'Eau de Parfum' ifadəsini EDP variantına çevirir", () => {
    expect(parseQuery("sauvage eau de parfum 60 ml")).toMatchObject({ variant: "edp", volumeMl: 60 });
  });

  it("yazılış səhvlərini alias ilə düzəldir", () => {
    expect(parseQuery("Dior savaş 100ml").tokens).toEqual(["dior", "sauvage"]);
    expect(parseQuery("Диор саваж").tokens).toEqual(["dior", "sauvage"]);
  });

  it("'Parfüm' tək yazılanda kateqoriya, məhsulla birlikdə variant olur", () => {
    expect(parseQuery("Parfüm")).toMatchObject({ tokens: [], variant: null, categories: ["perfume"] });
    expect(parseQuery("dior sauvage parfum")).toMatchObject({ tokens: ["dior", "sauvage"], variant: "parfum" });
  });

  it("'iPhone 15' rəqəmi ayrıca token kimi saxlayır", () => {
    expect(parseQuery("iPhone15").tokens).toEqual(["iphone", "15"]);
  });

  it("'qiymət' kimi köməkçi sözləri atır", () => {
    expect(parseQuery("dior sauvage qiymət azn").tokens).toEqual(["dior", "sauvage"]);
  });

  it("yalnız həcm yazılıbsa boş sorğu qaytarır", () => {
    const parsed = parseQuery("100 ml");
    expect(parsed.tokens).toEqual([]);
    expect(parsed.categories).toEqual([]);
  });
});

describe("matchProducts", () => {
  const index = indexProducts([
    product({ id: "edp100", variant: "edp", volumeMl: 100 }),
    product({ id: "edt100", displayName: "Dior Sauvage Eau de Toilette 100 ml", variant: "edt" }),
    product({ id: "edp60", displayName: "Dior Sauvage Eau de Parfum 60 ml", volumeMl: 60 }),
    product({
      id: "iphone",
      displayName: "Apple iPhone 15 128 GB",
      brand: "Apple",
      model: "iPhone 15",
      category: "smartphone",
      variant: null,
      volumeMl: null,
    }),
  ]);
  const ids = (q: string) => matchProducts(index, parseQuery(q)).map((p) => p.id).sort();

  it("həcm və varianta görə dəqiq süzür", () => {
    expect(ids("Dior Sauvage EDP 100 ml")).toEqual(["edp100"]);
    expect(ids("Dior Sauvage 100 ml")).toEqual(["edp100", "edt100"]);
    expect(ids("Dior Sauvage")).toEqual(["edp100", "edp60", "edt100"]);
  });

  it("kateqoriya üzrə axtarışda yalnız həmin kateqoriyanı qaytarır", () => {
    expect(ids("Parfüm")).toEqual(["edp100", "edp60", "edt100"]);
    expect(ids("Parfüm 60 ml")).toEqual(["edp60"]);
  });

  it("prefiks uyğunluğu işləyir, rəqəm isə dəqiq uyğunlaşır", () => {
    expect(ids("sauv")).toEqual(["edp100", "edp60", "edt100"]);
    expect(ids("iphone 1")).toEqual([]);
    expect(ids("iphone 15")).toEqual(["iphone"]);
  });

  it("uyğun məhsul yoxdursa boş qaytarır", () => {
    expect(ids("Chanel Bleu")).toEqual([]);
    expect(ids("100 ml")).toEqual([]);
  });
});
