import { describe, expect, it } from "vitest";
import { compareTwo } from "@/lib/compare";
import { toPublicOffer } from "@/lib/search";
import { offer } from "./fixtures";

const pub = (price: number, name: string) => toPublicOffer(offer({ priceAzn: price, sellerName: name }));

describe("compareTwo", () => {
  it("iki satıcıda ucuz, baha və fərqi hesablayır", () => {
    const pair = compareTwo([pub(3.25, "Bazarstore"), pub(3.1, "Araz Market")]);
    expect(pair?.cheapest.seller).toBe("Araz Market");
    expect(pair?.priciest.seller).toBe("Bazarstore");
    expect(pair?.diffAzn).toBe(0.15);
    expect(pair?.diffPct).toBe(5);
  });

  it("qiymətlər eynidirsə fərq 0 olur", () => {
    expect(compareTwo([pub(2, "A"), pub(2, "B")])).toMatchObject({ diffAzn: 0, diffPct: 0 });
  });

  it("iki satıcı deyilsə müqayisə yoxdur", () => {
    expect(compareTwo([pub(1, "A")])).toBeNull();
    expect(compareTwo([pub(1, "A"), pub(2, "B"), pub(3, "C")])).toBeNull();
  });
});
