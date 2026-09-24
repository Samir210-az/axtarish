import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OfferList } from "@/components/OfferList";
import { ProductSection } from "@/components/ProductSection";
import { SortBar } from "@/components/SortBar";
import { statsByAuthenticity } from "@/lib/stats";
import { toPublicOffer } from "@/lib/search";
import type { ProductResult } from "@/lib/types";
import { offer } from "./fixtures";

function resultWith(prices: number[]): ProductResult {
  const offers = prices.map((price, i) =>
    offer({ priceAzn: price, sellerName: `Mağaza ${i + 1}`, sellerKey: `s${i}` }),
  );
  const sellerOffers = offers.map(toPublicOffer).sort((a, b) => a.priceAzn - b.priceAzn);
  return {
    productId: "p1",
    name: "ABC Krem Amonyaklı 500 ml",
    variant: null,
    volumeMl: 500,
    groups: statsByAuthenticity(offers),
    offers: sellerOffers,
    offersTruncated: false,
    sellerCount: sellerOffers.length,
    minPriceAzn: sellerOffers[0]?.priceAzn ?? 0,
    maxPriceAzn: sellerOffers[sellerOffers.length - 1]?.priceAzn ?? 0,
    maxDiscountPct: null,
    sellerOffers,
  };
}

describe("ProductSection göstərilməsi", () => {
  it("1 satıcıda köhnə 'kifayət qədər məlumat yoxdur' mesajı qalır", () => {
    const html = renderToStaticMarkup(<ProductSection product={resultWith([3.25])} />);
    expect(html).toContain("Kifayət qədər məlumat yoxdur");
    expect(html).not.toContain("müqayisəsi");
  });

  it("2 satıcıda medianı uydurmadan müqayisə göstərir", () => {
    const html = renderToStaticMarkup(<ProductSection product={resultWith([3.25, 3.1])} />);
    expect(html).toContain("2 mağazanın müqayisəsi");
    expect(html).toContain("Ən ucuz");
    expect(html).toContain("Ən baha");
    expect(html).toContain("Mağaza 2");
    expect(html).toContain("Fərq:");
    expect(html).not.toContain("Median</dt>");
  });

  it("3 satıcıda median və xətkeş göstərir", () => {
    const html = renderToStaticMarkup(<ProductSection product={resultWith([3.1, 3.25, 3.4])} />);
    expect(html).toContain("Median");
    expect(html).not.toContain("müqayisəsi");
    expect(html).not.toContain("Kifayət qədər məlumat yoxdur");
  });
});

describe("SortBar", () => {
  it("dörd sıralamanı göstərir və cariyə aria-current qoyur", () => {
    const html = renderToStaticMarkup(<SortBar current="price_asc" hrefFor={(k) => `/?sort=${k}`} />);
    for (const label of ["Ən çox mağaza", "Ucuzdan bahaya", "Bahadan ucuza", "Ən böyük endirim"])
      expect(html).toContain(label);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*aria-current="true"[^>]*>Ucuzdan bahaya<\/a>/);
  });
});

describe("nağd ödəniş nişanı", () => {
  it("yalnız cashOnly qiymətdə nişan göstərir", () => {
    const cash = { ...toPublicOffer(offer({ priceAzn: 2, sellerName: "Almalı" })), cashOnly: true };
    const plain = toPublicOffer(offer({ priceAzn: 3, sellerName: "Bazarstore" }));
    const html = renderToStaticMarkup(<OfferList offers={[cash, plain]} truncated={false} />);
    expect(html.match(/nağd ödəniş üçün/g)).toHaveLength(1);
  });

  it("2 mağaza müqayisəsində nağd qeydini göstərir", () => {
    const product = resultWith([3.25, 3.1]);
    const marked = {
      ...product,
      sellerOffers: product.sellerOffers.map((o, i) => (i === 0 ? { ...o, cashOnly: true } : o)),
    };
    const html = renderToStaticMarkup(<ProductSection product={marked} />);
    expect(html).toContain("(nağd)");
    expect(html).toContain("yalnız nağd ödəniş üçün keçərlidir");
    expect(renderToStaticMarkup(<ProductSection product={resultWith([3.25, 3.1])} />)).not.toContain("(nağd)");
  });
});
