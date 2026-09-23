import { describe, expect, it } from "vitest";
import { hasWordSlug, querySpec, textMatchesQuery, urlMatchesQuery } from "../crawler/match";

describe("crawler/match", () => {
  it("sorğudan ad tokenlərini və həcmi ayırır", () => {
    expect(querySpec("Dior Sauvage 100 ml")).toEqual({ tokens: ["dior", "sauvage"], volumeMl: 100 });
    expect(querySpec("Parfüm").tokens).toEqual([]);
  });

  it("ünvan sluq-ına görə uyğunlaşdırır", () => {
    expect(urlMatchesQuery("https://a.az/products/christian-dior-sauvage-edp-100ml", "Dior Sauvage")).toBe(true);
    expect(urlMatchesQuery("https://a.az/product/dior-eau-sauvage", "Dior Sauvage")).toBe(true);
    expect(urlMatchesQuery("https://a.az/products/chanel-bleu", "Dior Sauvage")).toBe(false);
  });

  it("prefiks və yazılış fərqini (əlifba) qəbul edir", () => {
    expect(urlMatchesQuery("https://a.az/products/monoi-el-sabunu-190ml", "sabun")).toBe(true);
    expect(urlMatchesQuery("https://a.az/products/iphone-15-128gb-black", "iPhone 15")).toBe(true);
    expect(urlMatchesQuery("https://a.az/products/iphone-150-case", "iPhone 15")).toBe(false);
  });

  it("kodlaşdırılmış Azərbaycan hərflərini oxuyur", () => {
    expect(urlMatchesQuery("https://a.az/m%C9%99hsul/%C9%99tir-sauvage", "ətir Sauvage")).toBe(true);
  });

  it("sluqu olmayan ünvanı ayırd edir", () => {
    expect(hasWordSlug("https://a.az/index.php?route=product/product&product_id=7076")).toBe(false);
    expect(hasWordSlug("https://a.az/products/12345")).toBe(false);
    expect(hasWordSlug("https://a.az/p/12345-nike-air-max")).toBe(true);
    expect(hasWordSlug("https://a.az/products/dior-sauvage")).toBe(true);
  });

  it("məhsul adını sorğu ilə müqayisə edir", () => {
    expect(textMatchesQuery("Christian Dior Sauvage Parfum 60 ml", "Dior Sauvage")).toBe(true);
    expect(textMatchesQuery("Tom Ford Lost Cherry", "Dior Sauvage")).toBe(false);
  });
});
