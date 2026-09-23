import { describe, expect, it } from "vitest";
import { extractArazProduct } from "../crawler/nextRsc";

function item(fields: {
  id: number;
  title: string;
  slug: string;
  barcode: string | null;
  sales: string;
  discount: string;
  on: boolean;
}): string {
  const barcode = fields.barcode === null ? "null" : `"${fields.barcode}"`;
  return (
    `"id":${fields.id},"title":"${fields.title}","avg_rating":0,"slug":"${fields.slug}","description":null,` +
    `"barcode":${barcode},"nutritional_value":null,"sales_price":"${fields.sales}","discount_price":"${fields.discount}",` +
    `"is_discount":${fields.on},"discount_percent":32,"is_popular":false`
  );
}

function page(main: string, related: string[]): string {
  const json = `9:{"product":{${main},"recommended":[${related.map((r) => `{${r}}`).join(",")}]}}`;
  return `<html><script>self.__next_f.push([1,"${json.replace(/"/g, '\\"')}"])</script></html>`;
}

const main = item({
  id: 133,
  title: "Uşaq Sabunu 90qr",
  slug: "usaq-sabunu-90qr-133",
  barcode: "1000019397",
  sales: "1.40",
  discount: "0.95",
  on: true,
});
const plain = item({
  id: 1622,
  title: "Aloe Sabun 90 qr",
  slug: "aloe-sabun-90-qr-1622",
  barcode: "1000018652",
  sales: "1.55",
  discount: "1.55",
  on: false,
});
const html = page(main, [plain]);
const base = "https://www.arazmarket.az/az/products/";

describe("extractArazProduct", () => {
  it("endirimli məhsulda cari və köhnə qiyməti ayırır", () => {
    expect(extractArazProduct(html, `${base}usaq-sabunu-90qr-133`)).toEqual({
      name: "Uşaq Sabunu 90qr",
      brand: null,
      sku: "1000019397",
      gtin: null,
      priceAzn: 0.95,
      oldPriceAzn: 1.4,
      availability: "unknown",
      origin: "next",
    });
  });

  it("endirimsiz məhsulda köhnə qiymət qoymur", () => {
    const found = extractArazProduct(html, `${base}aloe-sabun-90-qr-1622`);
    expect(found).toMatchObject({ priceAzn: 1.55, oldPriceAzn: null });
  });

  it("əsas məhsulu ünvanın slug-ına görə seçir, əlaqəli məhsulları yox", () => {
    expect(extractArazProduct(html, `${base}usaq-sabunu-90qr-133/`)?.name).toBe("Uşaq Sabunu 90qr");
  });

  it("slug tapılmazsa və ya səhifədə məlumat yoxdursa null qaytarır", () => {
    expect(extractArazProduct(html, `${base}basqa-mehsul-999`)).toBeNull();
    expect(extractArazProduct("<html></html>", `${base}usaq-sabunu-90qr-133`)).toBeNull();
    expect(extractArazProduct(html, "yanlış ünvan")).toBeNull();
  });

  it("başlıqdakı unicode qaçışlarını açır və barkod olmayanda sku null olur", () => {
    const escaped = item({
      id: 5,
      title: "Sirab \\u00fc Su",
      slug: "sirab-5",
      barcode: null,
      sales: "0.70",
      discount: "0.70",
      on: false,
    });
    expect(extractArazProduct(page(escaped, []), `${base}sirab-5`)).toMatchObject({ name: "Sirab ü Su", sku: null });
  });
});
