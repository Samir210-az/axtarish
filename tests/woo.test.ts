import { describe, expect, it } from "vitest";
import { evaluatePage } from "../crawler/evaluate";
import { SOURCES } from "../crawler/sources";
import { extractWooProduct } from "../crawler/woo";

const AZN = '<span class="woocommerce-Price-currencySymbol" translate="no">AZN</span>';
const amount = (value: string): string =>
  `<span class="woocommerce-Price-amount amount"><bdi>${value}&nbsp;${AZN}</bdi></span>`;

const SALE = `<p class="price"><del aria-hidden="true">${amount("369.0")}</del> <span class="screen-reader-text">Original price was: 369.0&nbsp;AZN.</span><ins aria-hidden="true">${amount("119.0")}</ins><span class="screen-reader-text">Current price is: 119.0&nbsp;AZN.</span></p>`;
const REGULAR = `<p class="price">${amount("799.0")}</p>`;
const RANGE = `<p class="price">${amount("100.0")} – ${amount("200.0")}</p>`;
const RELATED = `<div class="wd-carousel-item"><div class="wd-product product type-product post-134503 status-publish outofstock"><h3><a href="/product/x/">Apple iPhone 14 Pro</a></h3><span class="price"><del>${amount("975.0")}</del><ins>${amount("799.0")}</ins></span></div></div>`;

const LD = (availability: string): string =>
  '<script type="application/ld+json">{"@context":"https://schema.org/","@graph":[{"@type":"BreadcrumbList"},' +
  '{"@type":"Product","name":"CHRISTIAN DIOR SAUVAGE (M) EDP 100ML","sku":131136,"offers":[{"@type":"Offer",' +
  '"priceSpecification":[{"@type":"UnitPriceSpecification","price":"186.5","priceCurrency":"USD"}],' +
  `"availability":"https://schema.org/${availability}"}]}]}</script>`;

function page(
  priceBlock: string,
  availability = "InStock",
  containerClass = "product type-product post-131136 instock",
): string {
  return `<html><body class="single-product">${availability ? LD(availability) : ""}<div class="sticky"><span class="price">${amount("1.0")}</span></div>
    <div id="product-131136" class="${containerClass}">
    <h1 class="product_title entry-title wd-entities-title"> CHRISTIAN DIOR SAUVAGE (M) EDP 100ML </h1>${priceBlock}</div>${RELATED}</body></html>`;
}

describe("extractWooProduct", () => {
  it("endirimli məhsulda cari (ins) və köhnə (del) qiyməti oxuyur, JSON-LD-nin USD qiymətini yox", () => {
    const product = extractWooProduct(page(SALE));
    expect(product).toMatchObject({
      name: "CHRISTIAN DIOR SAUVAGE (M) EDP 100ML",
      sku: "131136",
      priceAzn: 119,
      oldPriceAzn: 369,
      availability: "in_stock",
      gtin: null,
    });
  });

  it("əlaqəli məhsulların və başlıqdan əvvəlki paneldəki qiymətləri qarışdırmır", () => {
    expect(extractWooProduct(page(SALE))?.priceAzn).toBe(119);
    expect(extractWooProduct(page(REGULAR))).toMatchObject({ priceAzn: 799, oldPriceAzn: null });
  });

  it("qiymət aralığı və ya başlıq yoxdursa null qaytarır", () => {
    expect(extractWooProduct(page(RANGE))).toBeNull();
    expect(extractWooProduct('<html><p class="price"></p></html>')).toBeNull();
    expect(extractWooProduct(page(""))).toBeNull();
  });

  it("əlaqəli məhsulun outofstock sinfi əsas məhsulun stokuna təsir etmir", () => {
    expect(extractWooProduct(page(SALE))?.availability).toBe("in_stock");
    expect(extractWooProduct(page(SALE, "", "product type-product instock"))?.availability).toBe("in_stock");
  });

  it("stokda olmayanı JSON-LD-dən və ya əsas konteynerin sinfindən tanıyır", () => {
    expect(extractWooProduct(page(SALE, "OutOfStock"))?.availability).toBe("out_of_stock");
    expect(extractWooProduct(page(SALE, "", "product type-product outofstock"))?.availability).toBe("out_of_stock");
  });

  it("nə JSON-LD, nə də sinif varsa naməlum saxlayır", () => {
    expect(extractWooProduct(page(SALE, "", "product type-product"))?.availability).toBe("unknown");
  });
});

describe("almali reyestrdə", () => {
  const source = SOURCES.find((s) => s.id === "almali");
  if (!source) throw new Error("almali yoxdur");

  it("woo-html adapteri ilə və kataloqa daxildir", () => {
    expect(source.adapter).toBe("woo-html");
    expect(source.catalog).not.toBe(false);
  });

  it("səhifə qiymətli təklifə çevrilir (ətir kimi tanınır)", () => {
    const { outcome, item } = evaluatePage(source, {
      url: "https://almali.az/product/christian-dior-sauvage-m-edp-100ml/",
      body: page(SALE),
    });
    expect(outcome).toBe("ok");
    expect(item).toMatchObject({ priceAzn: 119, oldPriceAzn: 369, sourceId: "almali" });
    expect(item?.identity.category).toBe("perfume");
    expect(item?.identity.volumeMl).toBe(100);
  });
});
