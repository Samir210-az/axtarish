export type SourceKind = "retailer" | "marketplace" | "classifieds" | "delivery_aggregator";
export type SourcePlan = "pilot" | "candidate" | "blocked" | "excluded";

export interface Source {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  categories: string[];
  plan: SourcePlan;
  samples?: string[];
  note?: string;
  findings?: string;
}

export const SOURCES: Source[] = [
  {
    id: "birmarket",
    name: "Birmarket (Umico)",
    url: "https://birmarket.az/",
    kind: "marketplace",
    categories: ["elektronika", "parfüm", "kosmetika", "məişət", "geyim", "uşaq"],
    plan: "blocked",
    samples: [
      "https://birmarket.az/tags/dior-sauvage",
      "https://birmarket.az/product/396858-tualet-suyu-dior-sauvage-100-ml",
    ],
    note: "Bir məhsul üzrə bir neçə satıcı. Ad ilə link uyğun gəlmir, adı əsas götür.",
    findings:
      "2026-09-23: robots.txt oxunur, amma səhifələr HTTP 403 qaytarır (avtomatik giriş bağlıdır). Keçməyə çalışmıram. Yol: rəsmi API/icazə (business.umico.az).",
  },
  {
    id: "kontakt",
    name: "Kontakt Home",
    url: "https://kontakt.az/",
    kind: "retailer",
    categories: ["elektronika", "məişət texnikası", "ətriyyat", "mebel"],
    plan: "blocked",
    samples: ["https://kontakt.az/iphone-15-128-gb-black"],
    note: "Qiymət başlıq meta-sında (product:price:amount).",
    findings:
      "2026-09-23: Cloudflare yoxlaması (Just a moment) HTTP 403. Keçməyə çalışmıram. Yol: icazə və ya feed.",
  },
  {
    id: "irshad",
    name: "İrşad Electronics",
    url: "https://irshad.az/",
    kind: "retailer",
    categories: ["elektronika", "məişət texnikası", "mebel"],
    plan: "pilot",
    samples: ["https://irshad.az/mehsullar/iphone-15-128-gb-black"],
    note: "Qiymət və köhnə qiymət səhifə mətnindədir.",
    findings:
      "2026-09-23: HTTP 200, qiymət və köhnə qiymət server tərəfindən yazılıb (Laravel). robots: Crawl-delay 30 saniyə, yalnız filtr sorğuları qadağandır.",
  },
  {
    id: "bakuelectronics",
    name: "Baku Electronics",
    url: "https://bakuelectronics.az/",
    kind: "retailer",
    categories: ["elektronika"],
    plan: "blocked",
    findings: "2026-09-23: Cloudflare yoxlaması HTTP 403. Keçməyə çalışmıram.",
  },
  {
    id: "ispace",
    name: "iSpace",
    url: "https://ispace.az/",
    kind: "retailer",
    categories: ["elektronika"],
    plan: "pilot",
    findings:
      "2026-09-23: HTTP 200, Nuxt (SSR). robots sorğu sətirli (?) bütün ünvanları və /search-ü qadağan edir, yalnız təmiz yollar oxunur.",
  },
  {
    id: "almali",
    name: "Almalı",
    url: "https://almali.az/",
    kind: "retailer",
    categories: ["elektronika"],
    plan: "pilot",
    samples: ["https://almali.az/product/iphone-15-128gb-black/"],
    findings:
      "2026-09-23: HTTP 200, WooCommerce, məhsul səhifəsində JSON-LD Product var. robots /shop/ və add-to-cart-ı qadağan edir.",
  },
  {
    id: "breezy",
    name: "Breezy",
    url: "https://breezy.az/",
    kind: "retailer",
    categories: ["elektronika"],
    plan: "blocked",
    samples: ["https://breezy.az/smartphone/vendor=apple/series=iphone-15/internal-memory-size=128-gb"],
    findings: "2026-09-23: robots.txt və səhifələr Cloudflare yoxlaması ilə HTTP 403. Keçməyə çalışmıram.",
  },
  {
    id: "bazarstore",
    name: "Bazarstore",
    url: "https://bazarstore.az/",
    kind: "retailer",
    categories: ["ərzaq", "məişət kimyası", "gigiyena"],
    plan: "candidate",
    findings:
      "2026-09-23: HTTP 200, robots kataloqu bağlamır. Ana səhifə HTML-ində yalnız 4 qiymət var, məhsul səhifəsi yoxlanmalıdır.",
  },
  {
    id: "arazmarket",
    name: "Araz Market",
    url: "https://www.arazmarket.az/",
    kind: "retailer",
    categories: ["ərzaq", "məişət kimyası", "gigiyena"],
    plan: "pilot",
    findings:
      "2026-09-23: HTTP 200, Next.js, ana səhifə 1.5 MB (məlumat HTML-ə yazılıb ola bilər). robots yalnız /api, /admin, /cart, /checkout-u qadağan edir. Məhsul səhifəsi yoxlanmalıdır.",
  },
  {
    id: "bravo",
    name: "Bravo Supermarket",
    url: "https://bravosupermarket.az/",
    kind: "retailer",
    categories: ["ərzaq", "məişət kimyası", "gigiyena"],
    plan: "candidate",
    findings:
      "2026-09-23: HTTP 200, robots açıqdır (qadağa yoxdur). Ana səhifədə qiymət yoxdur, məlumat JavaScript ilə yüklənə bilər.",
  },
  {
    id: "neptun",
    name: "Neptun",
    url: "https://neptun.az/",
    kind: "retailer",
    categories: ["ərzaq", "məişət kimyası", "gigiyena"],
    plan: "candidate",
    findings:
      "2026-09-23: HTTP 200, amma cavab gövdəsi boşdur (0 bayt). Səbəbi bilinmir, yenidən yoxlanmalıdır.",
  },
  {
    id: "omid",
    name: "Omid",
    url: "https://omid.az/",
    kind: "retailer",
    categories: ["tikinti materialları", "məişət texnikası"],
    plan: "pilot",
    samples: ["https://omid.az/collections/yeni-gelen-mehsullar"],
    findings:
      "2026-09-23: HTTP 200, Shopify, qiymət HTML-də (data-js-product-price). Saytın adı 'İnşaat Materialları və Məişət Texnikası Mağazası': kosmetika yox, tikinti və texnikadır.",
  },
  {
    id: "yvesrocher",
    name: "Yves Rocher AZ",
    url: "https://www.yvesrocher.az/",
    kind: "retailer",
    categories: ["kosmetika", "gigiyena", "parfüm"],
    plan: "pilot",
    samples: ["https://www.yvesrocher.az/az/products/80049"],
    findings:
      "2026-09-23: HTTP 200, Shopify, məhsul səhifəsində JSON-LD Product və og:price var. Ən təmiz struktur.",
  },
  {
    id: "kosmetika",
    name: "Kosmetika.az",
    url: "https://kosmetika.az/",
    kind: "retailer",
    categories: ["kosmetika"],
    plan: "candidate",
    note: "Domen kataloq məlumatına əsaslanır, yoxlanmalıdır.",
    findings:
      "2026-09-23: HTTP 200, robots açıqdır. Ana səhifədə qiymət yoxdur, məhsul səhifəsi yoxlanmalıdır.",
  },
  {
    id: "aromi",
    name: "Aromi",
    url: "https://aromi.az/",
    kind: "retailer",
    categories: ["parfüm"],
    plan: "candidate",
    samples: ["https://aromi.az/kisi-ucun-etir/christian-dior-sauvage/"],
    findings: "2026-09-23: robots.txt alına bilmədi (fetch failed). Səbəb bilinmir, sorğu göndərilmədi.",
  },
  {
    id: "parfumshop",
    name: "ParfumShop",
    url: "https://www.parfumshop.az/",
    kind: "retailer",
    categories: ["parfüm"],
    plan: "pilot",
    samples: ["https://www.parfumshop.az/index.php?route=product/product&product_id=7076"],
    findings:
      "2026-09-23: HTTP 200, OpenCart, məhsul səhifəsində JSON-LD Product var. robots yalnız admin/ödəniş yollarını qadağan edir.",
  },
  {
    id: "lalafo",
    name: "Lalafo",
    url: "https://lalafo.az/",
    kind: "classifieds",
    categories: ["hər sahə"],
    plan: "blocked",
    samples: [
      "https://lalafo.az/azerbaijan/krasota-i-zdorove/parfyumeriya-2/q-dior-sauvage-100ml-qiymeti",
      "https://lalafo.az/digyakh/ads/kosmetik-dst-3-mhsul-id-110606107",
    ],
    note: "Fərdi satıcılar. Elan tarixi səhifədə var. Şəxsi məlumat toplanmır.",
    findings:
      "2026-09-23: Cloudflare yoxlaması HTTP 403. Keçməyə çalışmıram. Alternativ: rəsmi əməkdaşlıq və ya API.",
  },
  {
    id: "tapaz",
    name: "Tap.az",
    url: "https://tap.az/",
    kind: "classifieds",
    categories: ["hər sahə"],
    plan: "blocked",
    samples: ["https://tap.az/elanlar?keywords=dior+sauvage"],
    note: "Fərdi satıcılar. Şəxsi məlumat toplanmır.",
    findings: "2026-09-23: robots.txt və səhifələr Cloudflare yoxlaması ilə HTTP 403. Keçməyə çalışmıram.",
  },
  {
    id: "maqazin",
    name: "Maqazin.az",
    url: "https://maqazin.az/",
    kind: "classifieds",
    categories: ["hər sahə"],
    plan: "pilot",
    samples: ["https://maqazin.az/dior-sauvage-30-ml-etri-117471.html"],
    findings:
      "2026-09-23: HTTP 200, elan səhifəsində qiymət açıq (130 Azn). Elan tarixi hələ tapılmayıb, tapılmasa 30 günlük süzgəc üçün istifadə olunmayacaq.",
  },
  {
    id: "wolt",
    name: "Wolt Azərbaycan",
    url: "https://wolt.com/az/aze",
    kind: "delivery_aggregator",
    categories: ["ərzaq", "aptek", "kosmetika"],
    plan: "excluded",
    note: "Restoran, market və apteklərin qiymətləri var. Xarici platformadır, istifadə şərtləri yoxlanmadan toxunulmur.",
  },
];
