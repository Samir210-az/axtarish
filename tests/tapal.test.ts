import { describe, expect, it } from "vitest";
import { evaluatePage } from "../crawler/evaluate";
import { adSellerKey } from "../crawler/sellers";
import { SOURCES } from "../crawler/sources";
import { extractTapalAd } from "../crawler/tapal";
import { toPublicOffer } from "../lib/search";
import { offer } from "./fixtures";

const page = (title: string, availability = "InStock"): string =>
  `<html><head><title>${title}</title><script type="application/ld+json">{"@type":"Offer","price":"0.00","priceCurrency":"AZN","availability":"https://schema.org/${availability}","itemCondition":"https://schema.org/UsedCondition"}</script></head></html>`;
const URL_ = "https://tapal.az/elan/752-dehliz-dolabi";

describe("extractTapalAd", () => {
  it("başlıqdan ad, qiymət və şəhəri, ünvandan elan nömrəsini oxuyur", () => {
    expect(extractTapalAd(page("Dəhliz dolabı - 220 AZN | Bakı - TapAl.az"), URL_)).toEqual({
      name: "Dəhliz dolabı",
      brand: null,
      sku: "752",
      gtin: null,
      priceAzn: 220,
      oldPriceAzn: null,
      availability: "in_stock",
      origin: "title",
      city: "Bakı",
    });
  });

  it("JSON-LD-nin 0.00 qiymətinə baxmır, min ayırıcılı qiymətləri düzgün oxuyur", () => {
    expect(extractTapalAd(page("Changan Uni-Z - 5,000 AZN | Bakı - TapAl.az"), URL_)?.priceAzn).toBe(5000);
    expect(extractTapalAd(page("Traktor - 12.500 AZN | Gəncə - TapAl.az"), URL_)?.priceAzn).toBe(12500);
    expect(extractTapalAd(page("Divan - 1 500 AZN | Bakı - TapAl.az"), URL_)?.priceAzn).toBe(1500);
    expect(extractTapalAd(page("Kabel - 0,5 AZN | Bakı - TapAl.az"), URL_)?.priceAzn).toBe(0.5);
  });

  it("adda tire olsa da qiyməti son ' - N AZN' hissədən götürür", () => {
    const ad = extractTapalAd(page("Printer - mono lazer - 750 AZN | Bakı - TapAl.az"), URL_);
    expect(ad).toMatchObject({ name: "Printer - mono lazer", priceAzn: 750 });
  });

  it("HTML entity-lərini açır", () => {
    expect(extractTapalAd(page("Tom &amp; Jerry oyuncaq - 15 AZN | Bakı - TapAl.az"), URL_)?.name).toBe(
      "Tom & Jerry oyuncaq",
    );
  });

  it("qiymətsiz (razılaşma), sıfır qiymətli və ümumi başlıqlı elanları atır", () => {
    expect(extractTapalAd(page("Biznes təklifi - Razılaşma ilə | Bakı - TapAl.az"), URL_)).toBeNull();
    expect(extractTapalAd(page("Pulsuz kitab - 0 AZN | Bakı - TapAl.az"), URL_)).toBeNull();
    expect(extractTapalAd(page("TapAl.az - Pulsuz Elanlar Saytı | Azərbaycanda Elan Ver, Al, Sat"), URL_)).toBeNull();
    expect(extractTapalAd("<html></html>", URL_)).toBeNull();
  });

  it("stokda olmayan və naməlum mövcudluğu ayırır", () => {
    expect(extractTapalAd(page("Stul - 20 AZN | Bakı - TapAl.az", "OutOfStock"), URL_)?.availability).toBe(
      "out_of_stock",
    );
    expect(extractTapalAd("<title>Stul - 20 AZN | Bakı - TapAl.az</title>", URL_)?.availability).toBe("unknown");
  });
});

describe("adSellerKey", () => {
  it("eyni ad, qiymət və şəhər eyni açar verir (söz sırası və böyük-kiçik hərf fərq salmır)", () => {
    expect(adSellerKey("tapal", "Puf kreslo", 85, "Bakı")).toBe(adSellerKey("tapal", "KRESLO puf", 85, "bakı"));
  });

  it("qiymət, şəhər və mənbə fərqli olanda açar fərqli olur", () => {
    const base = adSellerKey("tapal", "Puf kreslo", 85, "Bakı");
    expect(adSellerKey("tapal", "Puf kreslo", 90, "Bakı")).not.toBe(base);
    expect(adSellerKey("tapal", "Puf kreslo", 85, "Gəncə")).not.toBe(base);
    expect(adSellerKey("laylo", "Puf kreslo", 85, "Bakı")).not.toBe(base);
  });
});

describe("tapal reyestrdə və qiymətə çevrilmədə", () => {
  const source = SOURCES.find((s) => s.id === "tapal");
  if (!source) throw new Error("tapal reyestrdə yoxdur");

  it("marketplace, tapal-title adapteri, kataloqa daxil", () => {
    expect(source).toMatchObject({ kind: "marketplace", adapter: "tapal-title" });
    expect(source.catalog).not.toBe(false);
  });

  it("elan fərdi satıcı və marketplace kimi saxlanılır, eyni elanın təkrarı eyni satıcı olur", () => {
    const a = evaluatePage(source, { url: URL_, body: page("Samsung Galaxy S23 256GB - 85 AZN | Bakı - TapAl.az") });
    const b = evaluatePage(source, {
      url: "https://tapal.az/elan/900-puf",
      body: page("Samsung Galaxy S23 256GB - 85 AZN | Bakı - TapAl.az"),
    });
    const c = evaluatePage(source, {
      url: "https://tapal.az/elan/901-puf",
      body: page("Samsung Galaxy S23 256GB - 95 AZN | Bakı - TapAl.az"),
    });
    expect(a.outcome).toBe("ok");
    expect(a.item).toMatchObject({ sellerType: "individual", sourceType: "marketplace", priceAzn: 85 });
    expect(a.item?.sellerKey).toMatch(/^ad:/);
    expect(b.item?.sellerKey).toBe(a.item?.sellerKey);
    expect(c.item?.sellerKey).not.toBe(a.item?.sellerKey);
  });

  it("fərdi satıcının adı və linki ictimai cavaba düşmür", () => {
    const publicOffer = toPublicOffer(
      offer({
        sellerType: "individual",
        sellerName: null,
        sellerUrl: "https://tapal.az/elan/752-dehliz-dolabi",
        sourceType: "marketplace",
      }),
    );
    expect(publicOffer.seller).toBeNull();
    expect(publicOffer.sellerUrl).toBeNull();
    expect(publicOffer.sellerType).toBe("individual");
  });
});
