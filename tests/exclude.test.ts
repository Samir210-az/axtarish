import { describe, expect, it } from "vitest";
import { evaluatePage } from "../crawler/evaluate";
import { dropExcluded, isExcludedText, isExcludedUrl, shouldSkipUrl, slugText } from "../crawler/exclude";
import { isAllowed, parseRobots } from "../crawler/robots";
import { SOURCES } from "../crawler/sources";

describe("isExcludedText: maşın və əmlak atılır", () => {
  it.each([
    "Changan Uni-Z",
    "Toyota Camry 2018",
    "Lada vaz 2107",
    "Chevrolet Aveo Vanus Datciki",
    "Mənzil satılır 3 otaqlı",
    "2 otaqlı köhnə tikili",
    "Həyət evi satılır",
    "Bağ evi satılır",
    "Kirayə ev",
    "Yasamal alatava 1də 2otaq kirayə verilir",
    "Avtomobil satışı",
    "Maşın satışı",
    "Kirayə maşın",
    "Rent a car",
    "Torpaq sahəsi",
    "Obyekt satılır",
    "Əmlak xidməti",
    "Yeni tikili 3 otaq",
    "Sürücü tələb olunur",
    "Operator xanımlar tələb olunur!",
    "Resepşn tələb olunur",
    "İcarəyə kiosk(köşk)",
    "Vakansiya: satış meneceri",
  ])("atılır: %s", (title) => {
    expect(isExcludedText(title)).toBe(true);
  });

  it.each([
    "Paltaryuyan maşın",
    "Maşın yataq",
    "Qəhvə maşını",
    "Tikiş maşını",
    "Torpaq qarışığı satılır",
    "Mənzil qapısı",
    "Ev mebeli satılır",
    "Bağ mebeli",
    "iPhone 15 128GB",
    "Avtomobil altı yoxlayan güzgü",
    "Mercedes-Benz Man EDP 100 ml",
    "Bmw oyuncaq maşın",
    "Puf kreslo",
    "Dior Sauvage EDP 100 ml",
    "ABC KREM AMONYAKLI 500 ML",
    "Sabun Palmolive",
    "Sudluk soyuducu",
    "Kiosk üçün kassa aparatı",
    "iPhone 15 Pro Max 256GB",
  ])("saxlanılır: %s", (title) => {
    expect(isExcludedText(title)).toBe(false);
  });
});

describe("isExcludedUrl və shouldSkipUrl: səhifə oxunmadan", () => {
  it("kateqoriya sətrinə görə atır", () => {
    expect(isExcludedUrl("https://tap.az/elanlar/neqliyyat/avtomobiller/123")).toBe(true);
    expect(isExcludedUrl("https://tap.az/elanlar/dasinmaz-emlak/menziller/1")).toBe(true);
    expect(isExcludedUrl("https://tezbazar.az/masinlar-avtomobiller")).toBe(true);
    expect(isExcludedUrl("https://laylo.az/category.php?slug=neqliyyat")).toBe(true);
  });

  it("digər kateqoriyaları toxunmaz saxlayır", () => {
    expect(isExcludedUrl("https://tap.az/elanlar/elektronika/telefonlar/1")).toBe(false);
    expect(isExcludedUrl("https://tapal.az/elan/752-dehliz-dolabi")).toBe(false);
    expect(isExcludedUrl("https://bazarstore.az/alafran-teserrufat-sabunu-800-q-2")).toBe(false);
    expect(isExcludedUrl("bu ünvan deyil")).toBe(false);
  });

  it("slug mətninə görə də atır", () => {
    expect(slugText("https://tapal.az/elan/513-changan-uni-z")).toBe("513 changan uni z");
    expect(shouldSkipUrl("https://tapal.az/elan/513-changan-uni-z")).toBe(true);
    expect(shouldSkipUrl("https://tapal.az/elan/2000-menzil-satilir-yasamalda")).toBe(true);
    expect(shouldSkipUrl("https://tapal.az/elan/752-dehliz-dolabi")).toBe(false);
  });
});

describe("Tap.az real ünvanları (2026-09-24 sitemap-ı)", () => {
  const base = "https://tap.az/elanlar";

  it.each([
    `${base}/neqliyyat/ehtiyyat-hisseleri-ve-aksesuarlar/24424843`,
    `${base}/dasinmaz-emlak/menziller/47765249`,
    `${base}/dasinmaz-emlak/torpaq-sahesi/47772360`,
    `${base}/dasinmaz-emlak/heyet-evleri/48757883`,
    `${base}/heyvanlar/itler/47779290`,
    `${base}/heyvanlar/quslar/47782719`,
    `${base}/elektronika/nomreler-ve-sim-kartlar/48747702`,
    `${base}/is-elanlari/satis/12345678`,
    `${base}/xidmetler/temir-ve-tikinti/12345678`,
  ])("oxunmur: %s", (url) => {
    expect(shouldSkipUrl(url)).toBe(true);
  });

  it.each([
    `${base}/elektronika/oyunlar-ve-programlar/18497740`,
    `${base}/elektronika/telefonlar/43510339`,
    `${base}/ev-ve-bag-ucun/meiset-texnikasi/28352690`,
    `${base}/hobbi-ve-asude/velosipedler/47775761`,
    `${base}/hobbi-ve-asude/idman-ve-asude/32942687`,
    `${base}/sexsi-esyalar/geyim-ayaqqabilar/48761395`,
    `${base}/usaqlar-ucun/usaq-mebeli/12345678`,
  ])("oxunur: %s", (url) => {
    expect(shouldSkipUrl(url)).toBe(false);
  });
});

describe("saxlama qarşısında son qoruma və səhifə səviyyəsi", () => {
  const item = (displayName: string) => ({ identity: { displayName } });

  it("dropExcluded uyğun gələnləri saymaqla ayırır", () => {
    const { kept, dropped } = dropExcluded([item("Puf kreslo"), item("Toyota Camry 2018"), item("Mənzil satılır")]);
    expect(kept.map((i) => i.identity.displayName)).toEqual(["Puf kreslo"]);
    expect(dropped).toBe(2);
  });

  it("səhifə oxunub, amma maşın başlıqlıdırsa nəticə 'excluded' olur və təklif yaranmır", () => {
    const source = SOURCES.find((s) => s.id === "tapal");
    if (!source) throw new Error("tapal yoxdur");
    const html = (title: string) => `<html><head><title>${title}</title></head></html>`;
    const car = evaluatePage(source, {
      url: "https://tapal.az/elan/513-x",
      body: html("Changan Uni-Z - 5,000 AZN | Bakı - TapAl.az"),
    });
    expect(car).toEqual({ outcome: "excluded" });
    const ok = evaluatePage(source, {
      url: "https://tapal.az/elan/752-x",
      body: html("Samsung Galaxy S23 256GB - 220 AZN | Bakı - TapAl.az"),
    });
    expect(ok.outcome).toBe("ok");
    const generic = evaluatePage(source, {
      url: "https://tapal.az/elan/753-x",
      body: html("Dəhliz dolabı - 220 AZN | Bakı - TapAl.az"),
    });
    expect(generic.outcome).toBe("generic");
  });
});

describe("Tap.az robots.txt (wildcard qaydaları)", () => {
  const rules = parseRobots(
    "User-Agent: *\nDisallow: /authentications\nDisallow: /auth/\nDisallow: /pages/rules\nDisallow: /pages/advertising\nDisallow: /bookmarks\nDisallow: /*new\n\nUser-agent: meta-externalagent\nDisallow: /\n\nUser-agent: dotbot\nCrawl-delay: 10\n",
    "Mozilla/5.0 (compatible; AxtarishBot/0.1; +https://axtarish-az.vercel.app; price research)",
  );

  it("bizim bot üçün * qrupu tətbiq olunur, digər botlara aid qaydalar yox", () => {
    expect(rules.crawlDelaySec).toBeNull();
    expect(isAllowed(rules, "/")).toBe(true);
  });

  it("/*new adında new olan hər yolu bağlayır, digərlərini yox", () => {
    expect(isAllowed(rules, "/elanlar/new")).toBe(false);
    expect(isAllowed(rules, "/elanlar/elektronika/telefonlar/123456")).toBe(true);
  });

  it("qadağan olunmuş yollara sorğu göndərilmir", () => {
    for (const path of ["/pages/rules", "/pages/advertising", "/bookmarks", "/auth/login", "/authentications"]) {
      expect(isAllowed(rules, path)).toBe(false);
    }
  });
});
