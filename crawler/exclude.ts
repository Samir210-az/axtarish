import { tokensOf } from "../lib/normalize";

// Nəqliyyat, daşınmaz əmlak və məhsul olmayan sahələr (iş, xidmət, heyvan, nömrə): bu sahələrin elanları
// nə oxunur, nə də saxlanılır. Kateqoriya sətirləri URL yolunda tam uyğunluqla yoxlanır.
// Tap.az ünvanı: /elanlar/{kateqoriya}/{alt-kateqoriya}/{nömrə} (real siyahı 2026-09-24 sitemap-ından).
const EXCLUDED_SEGMENTS = new Set([
  // Tap.az 1-ci səviyyə
  "is-elanlari",
  "xidmetler",
  "heyvanlar",
  // Tap.az alt-kateqoriya: telefon nömrələri və sim kartlar
  "nomreler-ve-sim-kartlar",
  // digər saytlarda rast gəlinən adlar
  "ustalar",
  "ustalar-ve-temir",
  "hazirliq-kurslari",
  "cv-ler",
  "turlar",
  "itmis-esyalar",
  "torpaq-sahesi",
  "ehtiyyat-hisseleri-ve-aksesuarlar",
  "neqliyyat",
  "avtomobiller",
  "masinlar",
  "masinlar-avtomobiller",
  "motosikletler-ve-mopedler",
  "avtobuslar-ve-xususi-texnika",
  "ehtiyat-hisseleri",
  "dasinmaz-emlak",
  "dasinmaz-emlak-ev-elanlari",
  "emlak",
  "menziller",
  "ev-alqi-satqisi",
  "heyet-evleri",
  "heyet-evleri-villalar",
  "villalar",
  "kiraye-evler",
  "kiraye-menziller",
  "yeni-tikili",
  "kohne-tikili",
  "obyekt-ofis",
  "torpaq-alqi-satqisi",
  "qarajlar",
  "xaricde-emlak",
]);

const REAL_ESTATE: RegExp[] = [
  /\b(menzil|villa|heyet evi|bag evi|ev|obyekt|ofis|magaza|dukan|qaraj|kupca|otaq|torpaq)\s+(satilir|satis|satisi|kiraye|icare|icareye|verilir)\b/,
  /\b(kiraye|icareye)\s+(menzil|ev|otaq|obyekt|ofis|magaza|dukan|qaraj|villa|torpaq)\b/,
  /\b\d+\s*otaqli\b/,
  /\botaqli\s+(menzil|ev)\b/,
  /\b(yeni|kohne)\s+tikili\b/,
  /\btorpaq sahesi\b/,
  /\bdasinmaz emlak\b/,
  /\bemlak\b/,
  /\b\d+\s*sot(ka)?\b/,
];

const CAR_SALE: RegExp[] = [
  /\b(avtomobil|masin|minik)\s+(satilir|satis|satisi|kiraye|icare|icareye|verilir)\b/,
  /\b(satilir|satis|kiraye|icareye|arenda)\s+(avtomobil|masin)\b/,
  /\brent a car\b/,
  /\barenda\s+(avtomobil|masin|masinlar)\b/,
  /\bavtomobil kirayesi\b/,
  /\b(minik avtomobil|yuk masini)\b/,
];

const CAR_MAKES = new Set([
  "toyota",
  "hyundai",
  "kia",
  "bmw",
  "mercedes",
  "lexus",
  "nissan",
  "chevrolet",
  "ford",
  "honda",
  "mazda",
  "opel",
  "volkswagen",
  "audi",
  "skoda",
  "renault",
  "peugeot",
  "changan",
  "chery",
  "haval",
  "byd",
  "lada",
  "vaz",
  "mitsubishi",
  "subaru",
  "suzuki",
  "porsche",
  "jeep",
  "dodge",
  "chrysler",
  "tesla",
  "geely",
  "dongfeng",
  "daewoo",
  "ravon",
  "uaz",
  "volvo",
  "fiat",
  "citroen",
  "infiniti",
  "cadillac",
  "jaguar",
  "bentley",
  "maserati",
  "ferrari",
  "lamborghini",
  "kamaz",
  "ssangyong",
]);

// Bu sözlər varsa, marka adı avtomobilə yox, ətrə, oyuncağa və s. aiddir.
const OTHER_DOMAIN = new Set(["ml", "edp", "edt", "parfum", "parfyum", "etir", "cologne", "eau", "oyuncaq", "usaq"]);

export function isExcludedText(text: string): boolean {
  const folded = tokensOf(text).join(" ");
  if (!folded) return false;
  if (REAL_ESTATE.some((rule) => rule.test(folded)) || CAR_SALE.some((rule) => rule.test(folded))) return true;
  const tokens = folded.split(" ");
  return tokens.some((token) => CAR_MAKES.has(token)) && !tokens.some((token) => OTHER_DOMAIN.has(token));
}

function foldSegment(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    /* dəyişməz qalır */
  }
  return tokensOf(decoded.replace(/[.]/g, " ")).join("-");
}

export function isExcludedUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split("/").filter(Boolean).map(foldSegment);
    const slug = url.searchParams.get("slug");
    if (slug) segments.push(foldSegment(slug));
    return segments.some((segment) => EXCLUDED_SEGMENTS.has(segment));
  } catch {
    return false;
  }
}

export function slugText(rawUrl: string): string {
  try {
    const last = new URL(rawUrl).pathname.split("/").filter(Boolean).pop() ?? "";
    let decoded = last;
    try {
      decoded = decodeURIComponent(last);
    } catch {
      /* dəyişməz qalır */
    }
    return decoded.replace(/[-_.]+/g, " ");
  } catch {
    return "";
  }
}

export function shouldSkipUrl(rawUrl: string): boolean {
  return isExcludedUrl(rawUrl) || isExcludedText(slugText(rawUrl));
}

export function dropExcluded<T extends { identity: { displayName: string } }>(
  items: T[],
): { kept: T[]; dropped: number } {
  const kept = items.filter((item) => !isExcludedText(item.identity.displayName));
  return { kept, dropped: items.length - kept.length };
}
