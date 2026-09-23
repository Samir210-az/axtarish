# Qiymət mənbələri

Yoxlama tarixi: 2026-09-23. Yoxlama GitHub Actions üzərində `Audit sources` işi ilə aparılıb (`crawler/audit.ts`). Bot özünü `AxtarishBot` adı ilə təqdim edir, `robots.txt`-a riayət edir və blok görəndə keçməyə çalışmır. `robots.txt` icazəsi istifadə şərtləri demək deyil, şərtləri ayrıca oxumaq lazımdır.

## Pilot (oxunur və struktur uyğundur)

| Sayt | Sahə | Texnologiya | Qeyd |
|---|---|---|---|
| yvesrocher.az | kosmetika, gigiyena, parfüm | Shopify | JSON-LD Product və og:price var |
| parfumshop.az | parfüm | OpenCart | JSON-LD Product var |
| almali.az | elektronika | WooCommerce | JSON-LD Product var |
| omid.az | tikinti materialları, məişət texnikası | Shopify | Qiymət HTML-dədir (`data-js-product-price`) |
| irshad.az | elektronika, məişət, mebel | Laravel | Qiymət və köhnə qiymət HTML-də. **Crawl-delay: 30 saniyə** |
| ispace.az | Apple texnikası | Nuxt (SSR) | robots sorğu sətirli (`?`) ünvanları qadağan edir |
| arazmarket.az | ərzaq, məişət kimyası, sabun | Next.js | Məhsul səhifəsi yoxlanmalıdır |
| maqazin.az | elan saytı | xüsusi | Qiymət açıqdır, elan tarixi hələ tapılmayıb |

## Namizəd (yoxlanmalıdır)

| Sayt | Vəziyyət |
|---|---|
| bazarstore.az | 200, ana səhifədə az qiymət var, məhsul səhifəsi yoxlanmalıdır |
| bravosupermarket.az | 200, robots açıqdır, qiymətlər JavaScript ilə yüklənə bilər |
| neptun.az | 200, amma cavab boşdur (0 bayt) |
| kosmetika.az | 200, ana səhifədə qiymət yoxdur |
| aromi.az | robots.txt alına bilmədi |

## Bloklanıb (toxunmuram)

Bu saytlar HTTP 403 və ya Cloudflare yoxlaması qaytarır. Yəni avtomatik giriş açıq şəkildə bağlıdır və mən bunu keçməyə çalışmıram.

| Sayt | Səbəb |
|---|---|
| birmarket.az (Umico) | HTTP 403. Yol: `business.umico.az` üzərindən rəsmi imkan |
| kontakt.az | Cloudflare |
| bakuelectronics.az | Cloudflare. Bir sınaqda 200, təkrarda 403: qeyri-sabit |
| breezy.az | Cloudflare |
| lalafo.az | Cloudflare |
| tap.az | Cloudflare |

**Runner haqqında:** yoxlamalar GitHub Actions-dan gəlir (ABŞ, Çikaqo, Microsoft şəbəkəsi). Blokun səbəbi ölkə, data mərkəzi şəbəkəsi və ya bot qorumasıdır, hələ ayırd edilməyib. Azərbaycandakı bir maşından eyni yoxlama aparılmalıdır.

## Kənarda

- **wolt.com/az**: xarici platformadır, istifadə şərtləri yoxlanmayıb.
- **Dərman qiymətləri**: Azərbaycanda dövlət tərəfindən tənzimlənir (Tarif Şurası). Ayrıca kateqoriya kimi düşünülməlidir. Buta Aptek və PharmaStore siyahıya salınmayıb.
- **Tapılmayan sahələr**: geyim, mebel, avtomobil ehtiyat hissələri, kitab və uşaq məhsulları üçün etibarlı yerli onlayn mağaza axtarışdan çıxmadı.

## Oxşar layihələr

`qiymeti.net`, `qiymetleri.az` və `SərfEt` alıcıya yönümlü qiymət müqayisəsi edir. Onlardan data götürmürük.

## Yenidən yoxlamaq

GitHub → Actions → **Audit sources** → Run workflow. Nəticə `audit-results` branch-indəki `audit-output.md` faylında olur.
