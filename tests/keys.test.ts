import { describe, expect, it } from "vitest";
import { identify } from "../crawler/identity";
import type { ExtractedProduct } from "../crawler/jsonld";
import { keysOf, resolveIdentity, type KnownKey } from "../crawler/keys";
import { planMerges, type MergeInput } from "../crawler/merge";

function raw(name: string, extra: Partial<ExtractedProduct> = {}): ExtractedProduct {
  return {
    name,
    brand: null,
    sku: null,
    gtin: null,
    priceAzn: 1,
    oldPriceAzn: null,
    availability: "in_stock",
    origin: "jsonld",
    ...extra,
  };
}

function ident(name: string, extra: Partial<ExtractedProduct> = {}) {
  const found = identify(raw(name, extra));
  if (!found) throw new Error(`tanınmadı: ${name}`);
  return found;
}

describe("nameKey", () => {
  it("eyni malın müxtəlif mağaza yazılışları eyni ad açarını verir (barkodlu və barkodsuz)", () => {
    const bazar = ident("ABC KREM AMONYAKLI 500 ML", { brand: "ABC", gtin: "4760140100001" });
    const araz = ident("Abc Krem Amonyakli 500 Ml");
    expect(bazar.matchKey).toBe("gtin:4760140100001");
    expect(bazar.nameKey).not.toBeNull();
    expect(araz.nameKey).toBe(bazar.nameKey);
  });

  it("söz sırası və ölçünün yazılışı fərq salmır", () => {
    expect(ident("Abc Krem Amonyakli 750ml").nameKey).toBe(ident("ABC KREM 750 ML AMONYAKLI").nameKey);
  });

  it("marka sahəsi ad açarına təsir etmir", () => {
    expect(ident("NEVSKAYA PALTAR SABUNU 72% 180 Q", { brand: "NEVSKAYA KOSMETIKA" }).nameKey).toBe(
      ident("Nevskaya Paltar Sabunu 72% 180 q").nameKey,
    );
  });

  it("fərqli ölçü və fərqli ad fərqli açar verir", () => {
    expect(ident("Abc Krem Amonyakli 500 Ml").nameKey).not.toBe(ident("Abc Krem Amonyakli 750 Ml").nameKey);
    expect(ident("Arko Sabun Cotton Cream 90gr").nameKey).not.toBe(ident("Arko Sabun Cashmere Cream 90gr").nameKey);
  });

  it("ikidən az açar söz varsa ad açarı yoxdur (ümumi adlar birləşməsin)", () => {
    expect(ident("Sabun 90 qr").nameKey).toBeNull();
  });
});

describe("resolveIdentity", () => {
  const a = ident("ABC KREM AMONYAKLI 500 ML", { gtin: "111" });
  const b = ident("Abc Krem Amonyakli 500 Ml");

  it("heç nə tanınmırsa öz id-ni götürür və açarları qeydiyyata salır", () => {
    const known = new Map<string, KnownKey>();
    const r = resolveIdentity(a, known);
    expect(r.productId).toBe(a.productId);
    expect(r.registered.map((x) => x.kind).sort()).toEqual(["gtin", "name"]);
    expect(known.size).toBe(2);
  });

  it("barkodsuz məhsul barkodlunun ad açarı ilə eyni məhsula bağlanır", () => {
    const known = new Map<string, KnownKey>();
    const first = resolveIdentity(a, known);
    const second = resolveIdentity(b, known);
    expect(second.productId).toBe(first.productId);
    expect(second.registered).toEqual([]);
  });

  it("əvvəl barkodsuz gəlibsə, sonra gələn barkodlu ona bağlanır və barkodu mənimsədir", () => {
    const known = new Map<string, KnownKey>();
    const first = resolveIdentity(b, known);
    const second = resolveIdentity(a, known);
    expect(second.productId).toBe(first.productId);
    expect(second.adoptGtin).toBe(true);
    expect(known.get(`name:${a.nameKey}`)?.gtin).toBe("111");
  });

  it("barkod tanınırsa həmin məhsulu seçir və ad açarı başqa məhsuldadırsa ziddiyyəti bildirir", () => {
    const known = new Map<string, KnownKey>([
      ["gtin:111", { productId: "pA", gtin: "111" }],
      [`name:${a.nameKey}`, { productId: "pB", gtin: null }],
    ]);
    const r = resolveIdentity(a, known);
    expect(r.productId).toBe("pA");
    expect(r.conflictWith).toBe("pB");
  });

  it("fərqli barkodlu məhsulu yalnız ad eyni olduğuna görə birləşdirmir", () => {
    const other = ident("ABC KREM AMONYAKLI 500 ML", { gtin: "222" });
    const known = new Map<string, KnownKey>();
    const first = resolveIdentity(a, known);
    const second = resolveIdentity(other, known);
    expect(second.productId).toBe(other.productId);
    expect(second.productId).not.toBe(first.productId);
  });

  it("keysOf yalnız mövcud açarları qaytarır", () => {
    expect(keysOf({ gtin: null, nameKey: null })).toEqual([]);
    expect(keysOf({ gtin: "1", nameKey: "x|-|-" })).toEqual(["gtin:1", "name:x|-|-"]);
  });
});

describe("planMerges", () => {
  const p = (id: string, gtin: string | null, nameKey: string | null, createdAt = 1): MergeInput => ({
    id,
    gtin,
    nameKey,
    createdAt,
  });

  it("eyni ad açarlı barkodsuz məhsulları ən köhnəsinə birləşdirir", () => {
    const plan = planMerges([p("a", null, "n", 5), p("b", null, "n", 2), p("c", null, "n", 9)]);
    expect(plan.merges).toEqual(
      expect.arrayContaining([
        { from: "a", into: "b" },
        { from: "c", into: "b" },
      ]),
    );
    expect(plan.merges).toHaveLength(2);
  });

  it("barkodlu məhsul varsa barkodsuzlar ona birləşir", () => {
    const plan = planMerges([p("a", null, "n", 1), p("b", "111", "n", 9)]);
    expect(plan.merges).toEqual([{ from: "a", into: "b" }]);
  });

  it("iki fərqli barkod eyni ad açarı ilə birləşdirilmir, barkodsuz isə qeyri-müəyyən sayılır", () => {
    const plan = planMerges([p("a", "111", "n"), p("b", "222", "n"), p("c", null, "n")]);
    expect(plan.merges).toEqual([]);
    expect(plan.ambiguous).toEqual([{ nameKey: "n", ids: ["c"] }]);
  });

  it("eyni barkodlu təkrarları birləşdirir", () => {
    const plan = planMerges([p("a", "111", null, 3), p("b", "111", null, 1)]);
    expect(plan.merges).toEqual([{ from: "a", into: "b" }]);
  });

  it("zəncirvari birləşmə yaratmır: hədəf özü mənbə olmur", () => {
    const plan = planMerges([p("a", "111", "n", 3), p("b", "111", "n", 1), p("c", null, "n", 2)]);
    const froms = new Set(plan.merges.map((m) => m.from));
    for (const m of plan.merges) expect(froms.has(m.into)).toBe(false);
  });
});
