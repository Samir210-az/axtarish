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
  adapter?: "generic-jsonld" | "araz-rsc" | "woo-html" | "tapal-title" | "tap-jsonld";
  azOnly?: boolean;
  sitemapPolicy?: { startOnly?: string; lastChildren?: number; maxUrls?: number };
  catalog?: boolean;
  productUrlPattern?: string;
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
      "2026-09-23: robots.txt kateqoriya səhifələrinə (?view=categories, ?page=) açıq Allow verir, amma həm ABŞ data mərkəzindən (GitHub Actions), həm Azərbaycan şəbəkəsindən (Termux) HTTP 403 gəlir. Səbəb ölkə deyil, Cloudflare bot qaydasıdır. Keçməyə çalışmıram. Yol: Birmarket/Umico-dan AxtarishBot üçün icazə və ya rəsmi API (business.umico.az).",
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
    findings: "2026-09-23: Cloudflare yoxlaması (Just a moment) HTTP 403. Keçməyə çalışmıram. Yol: icazə və ya feed.",
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
    plan: "candidate",
    findings:
      "2026-09-23: Azərbaycan şəbəkəsindən (mobil, Termux) HTTP 200 və tam səhifə. ABŞ data mərkəzindən (GitHub Actions) Cloudflare yoxlaması çıxır. Yəni yalnız Azərbaycandakı maşından oxunur. robots və səhifə strukturu hələ Azərbaycandan yoxlanmayıb.",
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
    adapter: "woo-html",
    productUrlPattern: "/product/",
    samples: ["https://almali.az/product/iphone-15-128gb-black/"],
    findings:
      "2026-09-24: WooCommerce (Woodmart). JSON-LD qiyməti USD yazır və HTML-dəki manat qiymətindən fərqlidir, ona görə qiymət məhsul başlığından (h1) sonrakı əsas qiymət blokundan oxunur (del = köhnə, ins = cari, AZN). Ad və sku JSON-LD-dən. Diqqət: bəzi məhsulların təsvirində kampaniya qiymətinin yalnız nağd ödəniş üçün keçərli olduğu, kartla rəsmi qiymətin tətbiq olunduğu yazılıb. robots /shop/ və add-to-cart-ı qadağan edir.",
  },
  {
    id: "breezy",
    name: "Breezy",
    url: "https://breezy.az/",
    kind: "retailer",
    categories: ["elektronika"],
    plan: "candidate",
    samples: ["https://breezy.az/smartphone/vendor=apple/series=iphone-15/internal-memory-size=128-gb"],
    findings:
      "2026-09-23: Azərbaycan şəbəkəsindən (mobil, Termux) HTTP 200 və tam səhifə. ABŞ data mərkəzindən (GitHub Actions) Cloudflare yoxlaması çıxır. Yəni yalnız Azərbaycandakı maşından oxunur. robots və səhifə strukturu hələ Azərbaycandan yoxlanmayıb.",
  },
  {
    id: "bazarstore",
    name: "Bazarstore",
    url: "https://bazarstore.az/",
    kind: "retailer",
    categories: ["ərzaq", "məişət kimyası", "gigiyena"],
    plan: "pilot",
    adapter: "generic-jsonld",
    productUrlPattern: "^https://bazarstore\\.az/[^/?#]+/?$",
    findings:
      "2026-09-24: nopCommerce. Məhsul səhifəsində standart JSON-LD Product var: ad, marka, sku, gtin (əsl EAN-13), qiymət (AZN), stok. Köhnə qiymət yalnız HTML-də (old-product-price). Məhsul və kateqoriya ünvanları eyni formatdadır (/{ad}), ona görə sitemap-dan ada görə süzülür. robots.txt /search-i qadağan edir, sayt axtarışından istifadə edilmir.",
  },
  {
    id: "arazmarket",
    name: "Araz Market",
    url: "https://www.arazmarket.az/",
    kind: "retailer",
    categories: ["ərzaq", "məişət kimyası", "gigiyena"],
    plan: "pilot",
    adapter: "araz-rsc",
    productUrlPattern: "/az/products/",
    findings:
      "2026-09-24: sitemap https://www.arazmarket.az/sitemap.xml, məhsullar /az/products/{ad}-{id} (az/en/ru üçün ayrı ünvan). JSON-LD yoxdur, məlumat Next.js-in səhifəyə gömdüyü obyektdədir: sales_price (adi), discount_price və is_discount (cari). Stok sahəsi yoxdur (unknown), barcode mağazanın daxili kodudur (EAN deyil). robots yalnız /api, /admin, /cart, /checkout-u qadağan edir.",
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
    findings: "2026-09-23: HTTP 200, amma cavab gövdəsi boşdur (0 bayt). Səbəbi bilinmir, yenidən yoxlanmalıdır.",
  },
  {
    id: "omid",
    name: "Omid",
    url: "https://omid.az/",
    kind: "retailer",
    categories: ["tikinti materialları", "məişət texnikası"],
    plan: "pilot",
    adapter: "generic-jsonld",
    productUrlPattern: "/products/",
    samples: ["https://omid.az/collections/yeni-gelen-mehsullar"],
    findings:
      "2026-09-23: HTTP 200, Shopify, qiymət HTML-də (data-js-product-price). Saytın adı 'İnşaat Materialları və Məişət Texnikası Mağazası': kosmetika yox, tikinti və texnikadır. 2026-09-24: gecə kataloquna qaytarılıb (40 dəq. büdcə). 28 824 ünvan olduğu üçün tam dövr ~40 gecədir və 30 günlük pəncərədən uzundur: qiymətlər dövrün sonunda köhnələ bilər (kataloq xülasəsində xəbərdarlıq çıxır).",
  },
  {
    id: "yvesrocher",
    name: "Yves Rocher AZ",
    url: "https://www.yvesrocher.az/",
    kind: "retailer",
    categories: ["kosmetika", "gigiyena", "parfüm"],
    plan: "pilot",
    adapter: "generic-jsonld",
    productUrlPattern: "/products/",
    samples: ["https://www.yvesrocher.az/az/products/80049"],
    findings: "2026-09-23: HTTP 200, Shopify, məhsul səhifəsində JSON-LD Product və og:price var. Ən təmiz struktur.",
  },
  {
    id: "kosmetika",
    name: "Kosmetika.az",
    url: "https://kosmetika.az/",
    kind: "retailer",
    categories: ["kosmetika"],
    plan: "candidate",
    note: "Domen kataloq məlumatına əsaslanır, yoxlanmalıdır.",
    findings: "2026-09-23: HTTP 200, robots açıqdır. Ana səhifədə qiymət yoxdur, məhsul səhifəsi yoxlanmalıdır.",
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
    adapter: "generic-jsonld",
    productUrlPattern: "product_id=\\d+",
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
    plan: "candidate",
    samples: [
      "https://lalafo.az/azerbaijan/krasota-i-zdorove/parfyumeriya-2/q-dior-sauvage-100ml-qiymeti",
      "https://lalafo.az/digyakh/ads/kosmetik-dst-3-mhsul-id-110606107",
    ],
    note: "Fərdi satıcılar. Elan tarixi səhifədə var. Şəxsi məlumat toplanmır.",
    findings:
      "2026-09-23: Azərbaycan şəbəkəsindən (mobil, Termux) HTTP 200 və tam səhifə. ABŞ data mərkəzindən (GitHub Actions) Cloudflare yoxlaması çıxır. Yəni yalnız Azərbaycandakı maşından oxunur. robots və səhifə strukturu hələ Azərbaycandan yoxlanmayıb.",
  },
  {
    id: "tapaz",
    name: "Tap.az",
    url: "https://tap.az/",
    kind: "classifieds",
    categories: ["hər sahə"],
    plan: "candidate",
    samples: ["https://tap.az/elanlar?keywords=dior+sauvage"],
    note: "Fərdi satıcılar. Şəxsi məlumat toplanmır.",
    findings:
      "2026-09-23: Azərbaycan şəbəkəsindən (mobil, Termux) HTTP 200 və tam səhifə. ABŞ data mərkəzindən (GitHub Actions) Cloudflare yoxlaması çıxır. Yəni yalnız Azərbaycandakı maşından oxunur. robots və səhifə strukturu hələ Azərbaycandan yoxlanmayıb.",
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
  {
    id: "tapal",
    name: "Tapal",
    url: "https://tapal.az/",
    kind: "marketplace",
    categories: ["elanlar"],
    plan: "pilot",
    adapter: "tapal-title",
    productUrlPattern: "/elan/",
    samples: ["https://tapal.az/elan/249-epson-m3170-mono-printer"],
    findings:
      "2026-09-24: elan saytı, ~1 657 elan (sitemap-ads). robots.txt sərbəstdir (axtaris?, api, admin qadağan). JSON-LD-də qiymət 0.00 və şərt hər elanda UsedCondition yazılıb (etibarsız), ona görə qiymət və şəhər başlıqdan oxunur: 'Ad - 750 AZN | Bakı - TapAl.az'. Razılaşma ilə qiymətsiz elanlar atılır. Hər elan ayrıca fərdi satıcı sayılır (sellerKey = ad:hash, eyni ad+qiymət+şəhər birləşir). Satıcı adı, telefon və link saxlanmır/göstərilmir.",
  },
  {
    id: "tap",
    name: "Tap.az",
    url: "https://tap.az/",
    kind: "marketplace",
    categories: ["elanlar"],
    plan: "pilot",
    adapter: "tap-jsonld",
    azOnly: true,
    catalog: false,
    productUrlPattern: "/elanlar/",
    sitemapPolicy: { startOnly: "/sitemap\\.xml$", lastChildren: 3, maxUrls: 150000 },
    findings:
      "2026-09-24: robots.txt elan səhifələrinə icazə verir (auth, bookmarks, pages/rules, pages/advertising və adında new olan yollar qadağan, gecikmə tələbi yoxdur). İstifadəçi qaydalar səhifəsində skript qadağası tapmadı (mən oxuya bilmirəm). GitHub (ABŞ) IP-sinə yoxlama çıxır, Azərbaycan IP-sindən (Termux sınağı) hamısı HTTP 200: yalnız Azərbaycandakı maşından oxunmalıdır (azOnly). Sitemap: indeks + 61 alt-fayl (tap.azstatic.com, hər biri ~3.6 MB, ~19 000 ünvan, artan nömrə ilə, ən yeni sonda): yalnız son 3 fayl oxunur. Ünvan /elanlar/{kateqoriya}/{alt-kateqoriya}/{nömrə}, ad ünvanda yoxdur. Elan səhifəsi: Product/Offer JSON-LD (price 650.00, AZN), başlıq Ad: 650 AZN — Şəhər, Azərbaycan | nömrə — Tap.Az. Səhifədə telefon nömrəsi var: heç vaxt oxunmur, adlardan da silinir. Satıcı Person blokuna baxılmır. Qadağan kateqoriyalar exclude.ts-dədir.",
  },
];
