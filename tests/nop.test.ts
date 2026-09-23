import { describe, expect, it } from "vitest";
import { extractProduct } from "../crawler/jsonld";
import { extractNopOldPrice } from "../crawler/nop";

const LD =
  '{"@context":"https://schema.org","@type":"Product","name":"ALAFRAN MAYE TƏSƏRRÜFAT SABUNU 800 Q 72%","sku":"30191661",' +
  '"gtin":"4760140101116","image":"https://bazarstore.az/images/thumbs/0036342_30191661_510.jpeg",' +
  '"brand":[{"@type":"Brand","name":"ALAFRAN"}],"offers":{"@type":"Offer","url":"https://bazarstore.az/alafran-teserrufat-sabunu-800-q-2",' +
  '"availability":"https://schema.org/InStock","price":"1.99","priceCurrency":"AZN"},"review":[],"hasVariant":[]}';

const html = (ld: string, extra = ""): string =>
  `<html><script type="application/ld+json">${ld}</script>${extra}</html>`;
const OLD = '<div class="old-product-price"> <span>Köhnə qiymət:</span> <span>2,99 &#x20BC;</span> </div>';

describe("bazarstore (nopCommerce) məhsul səhifəsi", () => {
  it("JSON-LD-dən ad, marka, EAN, qiymət və stoku oxuyur", () => {
    expect(extractProduct(html(LD))).toMatchObject({
      name: "ALAFRAN MAYE TƏSƏRRÜFAT SABUNU 800 Q 72%",
      brand: "ALAFRAN",
      gtin: "4760140101116",
      priceAzn: 1.99,
      availability: "in_stock",
    });
  });

  it("köhnə qiyməti HTML-dən çıxarır (vergüllü və mahiyyət kodlu)", () => {
    expect(extractNopOldPrice(html(LD, OLD))).toBe(2.99);
  });

  it("köhnə qiymət bloku yoxdursa null qaytarır", () => {
    expect(extractNopOldPrice(html(LD))).toBeNull();
  });
});
