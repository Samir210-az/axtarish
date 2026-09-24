import { PoliteFetcher, USER_AGENT } from "./http";

const SITES = ["https://tezbazar.az", "https://laylo.az", "https://ucuztap.az", "https://tapal.az"];

async function robotsHead(origin: string): Promise<string> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    const lines = text
      .split(/\r?\n/)
      .filter((l) => /^(user-agent|disallow|allow|crawl-delay|sitemap)/i.test(l.trim()))
      .slice(0, 22);
    return `HTTP ${res.status}, ${text.length} bayt\n    ${lines.join("\n    ")}`;
  } catch (e) {
    return `XƏTA ${e instanceof Error ? e.message : e}`;
  }
}

async function main() {
  for (const origin of SITES) {
    console.log(`\n===== ${origin}`);
    console.log(`robots.txt: ${await robotsHead(origin)}`);
    const fetcher = new PoliteFetcher();
    const sitemaps = await fetcher.sitemapsFor(origin);
    console.log(`sitemap-lar: ${JSON.stringify(sitemaps)}`);
    const home = await fetcher.get(`${origin}/`);
    if (!home.ok) {
      console.log(`ana səhifə: ${home.reason} ${home.detail}`);
      continue;
    }
    const b = home.body;
    const prices = (b.match(/(\d[\d\s]*)\s*(₼|AZN|Azn|azn)/g) ?? []).length;
    const ld = (b.match(/application\/ld\+json/g) ?? []).length;
    console.log(
      `ana səhifə: ${home.status}, ${b.length} bayt, qiymət ifadəsi=${prices}, ld+json=${ld}, cloudflare=${/cf-chl|just a moment/i.test(b)}`,
    );
    const links = [...new Set([...b.matchAll(/href="([^"#]*)"/g)].map((m) => m[1] as string))];
    const item = links.find((l) => /\d{5,}/.test(l) && !/uploads|\.jpg|\.png|\.webp|banner/i.test(l));
    console.log(`elan linki nümunəsi: ${item ?? "tapılmadı"}`);
    if (item) {
      const url = item.startsWith("http") ? item : new URL(item, origin).toString();
      const page = await fetcher.get(url);
      if (!page.ok) {
        console.log(`elan səhifəsi: ${page.reason} ${page.detail}`);
      } else {
        const p = page.body;
        console.log(
          `elan səhifəsi: ${page.status}, ${p.length} bayt, ld+json=${(p.match(/application\/ld\+json/g) ?? []).length}, ` +
            `og:price=${/product:price|og:price/i.test(p)}, telefon nişanı=${/tel:|\+994|05[015567]\s?\d{3}/.test(p)}, ` +
            `satıcı növü=${JSON.stringify(["Şirkət", "Mağaza", "Fərdi", "Vasitəçi", "Sahibkar"].filter((w) => p.includes(w)))}, ` +
            `tarix=${/\d{2}\.\d{2}\.\d{4}|Bu gün|Dünən/.test(p)}`,
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
