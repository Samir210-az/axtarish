import { describe, expect, it } from "vitest";
import { evaluatePage } from "../crawler/evaluate";
import { SOURCES, type Source } from "../crawler/sources";

function source(id: string): Source {
  const found = SOURCES.find((s) => s.id === id);
  if (!found) throw new Error(`${id} reyestrdə yoxdur`);
  return found;
}

const SOAP_LD = (availability: string): string =>
  '{"@context":"https://schema.org","@type":"Product","name":"ALAFRAN MAYE TƏSƏRRÜFAT SABUNU 800 Q 72%","sku":"30191661",' +
  '"gtin":"4760140101116","brand":[{"@type":"Brand","name":"ALAFRAN"}],"offers":{"@type":"Offer",' +
  `"availability":"https://schema.org/${availability}","price":"1.99","priceCurrency":"AZN"}}`;

const OLD_PRICE = '<div class="old-product-price"> <span>Köhnə qiymət:</span> <span>2,99 &#x20BC;</span> </div>';

function bazarPage(availability = "InStock"): { url: string; body: string } {
  return {
    url: "https://bazarstore.az/alafran-teserrufat-sabunu-800-q-2",
    body: `<html><script type="application/ld+json">${SOAP_LD(availability)}</script>${OLD_PRICE}</html>`,
  };
}

function arazPage(): { url: string; body: string } {
  const main =
    '"id":133,"title":"Uşaq Sabunu 90qr","avg_rating":0,"slug":"usaq-sabunu-90qr-133","description":null,' +
    '"barcode":"1000019397","nutritional_value":null,"sales_price":"1.40","discount_price":"0.95","is_discount":true';
  const json = `9:{"product":{${main},"recommended":[]}}`;
  return {
    url: "https://www.arazmarket.az/az/products/usaq-sabunu-90qr-133",
    body: `<html><script>self.__next_f.push([1,"${json.replace(/"/g, '\\"')}"])</script></html>`,
  };
}

describe("evaluatePage", () => {
  it("Bazarstore səhifəsindən EAN açarlı qiymət və köhnə qiyməti çıxarır", () => {
    const { outcome, item } = evaluatePage(source("bazarstore"), bazarPage());
    expect(outcome).toBe("ok");
    expect(item).toMatchObject({
      pageUrl: "https://bazarstore.az/alafran-teserrufat-sabunu-800-q-2",
      priceAzn: 1.99,
      oldPriceAzn: 2.99,
      sourceId: "bazarstore",
      sourceType: "online_store",
    });
    expect(item?.identity.matchKey).toBe("gtin:4760140101116");
  });

  it("Araz səhifəsindən endirimli qiyməti çıxarır", () => {
    const { outcome, item } = evaluatePage(source("arazmarket"), arazPage());
    expect(outcome).toBe("ok");
    expect(item).toMatchObject({ priceAzn: 0.95, oldPriceAzn: 1.4, sourceId: "arazmarket" });
    expect(item?.identity.matchKey.startsWith("gtin:")).toBe(false);
  });

  it("stokda olmayan məhsulu və məlumatsız səhifəni ayırır", () => {
    expect(evaluatePage(source("bazarstore"), bazarPage("OutOfStock")).outcome).toBe("outOfStock");
    expect(
      evaluatePage(source("bazarstore"), { url: "https://bazarstore.az/meyve", body: "<html></html>" }).outcome,
    ).toBe("noData");
  });

  it("sorğu rejimində ad və həcmə görə uyğunsuzu atır", () => {
    const page = bazarPage();
    expect(evaluatePage(source("bazarstore"), page, "sabun").outcome).toBe("ok");
    expect(evaluatePage(source("bazarstore"), page, "Dior Sauvage").outcome).toBe("mismatch");
    expect(evaluatePage(source("bazarstore"), page, "sabun 500 ml").outcome).toBe("mismatch");
  });
});

describe("mənbə reyestri (kataloq)", () => {
  it("almali, bazarstore və arazmarket kataloqa daxildir", () => {
    expect(source("almali").catalog).not.toBe(false);
    expect(source("bazarstore").catalog).not.toBe(false);
    expect(source("arazmarket").catalog).not.toBe(false);
  });

  it("omid kataloqa qaytarılıb", () => {
    expect(source("omid").catalog).not.toBe(false);
    expect(source("omid").adapter).toBe("generic-jsonld");
  });
});
