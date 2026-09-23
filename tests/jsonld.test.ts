import { describe, expect, it } from "vitest";
import { decodeEntities, extractProduct, parsePrice } from "../crawler/jsonld";

const ld = (json: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head></html>`;

describe("parsePrice", () => {
  it("müxtəlif formatları oxuyur", () => {
    expect(parsePrice("1699.99")).toBe(1699.99);
    expect(parsePrice("1 699,99")).toBe(1699.99);
    expect(parsePrice("1\u00a0699,99 ₼")).toBe(1699.99);
    expect(parsePrice("1,699.99")).toBe(1699.99);
    expect(parsePrice("1.699,99")).toBe(1699.99);
    expect(parsePrice("19,5")).toBe(19.5);
    expect(parsePrice("1,699")).toBe(1699);
    expect(parsePrice(12.5)).toBe(12.5);
  });

  it("yararsız və sıfır qiymətləri rədd edir", () => {
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("0")).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(-5)).toBeNull();
  });
});

describe("extractProduct", () => {
  it("Shopify tipli Product və Offer-i oxuyur", () => {
    const html = ld({
      "@context": "http://schema.org/",
      "@type": "Product",
      name: "Zeytun duş geli, 400 ml",
      brand: { "@type": "Brand", name: "Yves Rocher" },
      sku: "80049",
      offers: { "@type": "Offer", priceCurrency: "AZN", price: "19.00", availability: "http://schema.org/InStock" },
    });
    expect(extractProduct(html)).toMatchObject({
      name: "Zeytun duş geli, 400 ml",
      brand: "Yves Rocher",
      sku: "80049",
      priceAzn: 19,
      availability: "in_stock",
      origin: "jsonld",
    });
  });

  it("@graph daxilindəki məhsulu və offers massivini tapır (WooCommerce)", () => {
    const html = ld({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "Sayt" },
        {
          "@type": "Product",
          name: "iPhone 15 128GB Black",
          gtin13: "0195949036064",
          offers: [{ "@type": "Offer", price: 1758.99, priceCurrency: "AZN" }],
        },
      ],
    });
    expect(extractProduct(html)).toMatchObject({
      name: "iPhone 15 128GB Black",
      gtin: "0195949036064",
      priceAzn: 1758.99,
    });
  });

  it("ProductGroup-un ilk variantını götürür", () => {
    const html = ld({
      "@type": "ProductGroup",
      name: "Krem",
      brand: "Nivea",
      hasVariant: [{ "@type": "Product", name: "Krem 50 ml", offers: { price: "7.50", priceCurrency: "AZN" } }],
    });
    expect(extractProduct(html)).toMatchObject({ name: "Krem 50 ml", brand: "Nivea", priceAzn: 7.5 });
  });

  it("AZN olmayan valyutanı qəbul etmir", () => {
    const html = ld({ "@type": "Product", name: "X", offers: { price: "50", priceCurrency: "USD" } });
    expect(extractProduct(html)).toBeNull();
  });

  it("stokda yoxdur statusunu tanıyır", () => {
    const html = ld({
      "@type": "Product",
      name: "X",
      offers: { price: "5", priceCurrency: "AZN", availability: "https://schema.org/OutOfStock" },
    });
    expect(extractProduct(html)?.availability).toBe("out_of_stock");
  });

  it("köhnə qiyməti priceSpecification-dan götürür, yalnız yüksəkdirsə", () => {
    const make = (list: number) =>
      ld({
        "@type": "Product",
        name: "X",
        offers: {
          price: "80",
          priceCurrency: "AZN",
          priceSpecification: [{ priceType: "https://schema.org/ListPrice", price: list }],
        },
      });
    expect(extractProduct(make(100))?.oldPriceAzn).toBe(100);
    expect(extractProduct(make(70))?.oldPriceAzn).toBeNull();
  });

  it("pozuq JSON-u atır və OpenGraph-a keçir", () => {
    const html =
      '<script type="application/ld+json">{pozuq</script>' +
      '<meta property="og:title" content="Zeytun duş geli"><meta property="product:price:amount" content="19.00">' +
      '<meta property="product:price:currency" content="AZN">';
    expect(extractProduct(html)).toMatchObject({ name: "Zeytun duş geli", priceAzn: 19, origin: "og" });
  });

  it("məhsul olmayan səhifədə null qaytarır", () => {
    expect(extractProduct("<html><body>Salam</body></html>")).toBeNull();
    expect(extractProduct(ld({ "@type": "Organization", name: "X" }))).toBeNull();
  });

  it("HTML entity-ləri açır", () => {
    expect(decodeEntities("Sauvage &amp; Co &quot;100&quot; &#39;x&#39;")).toBe("Sauvage & Co \"100\" 'x'");
    const html = ld({ "@type": "Product", name: "A &amp; B", offers: { price: "5" } });
    expect(extractProduct(html)?.name).toBe("A & B");
  });
});
