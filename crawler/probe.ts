import { isAllowed, parseRobots, type RobotsRules } from "./robots";

const UA = "AxtarishBot/0.1 (+https://axtarish-az.vercel.app; price research)";

const TARGETS: Array<{ name: string; url: string }> = [
  { name: "birmarket-tag", url: "https://birmarket.az/tags/dior-sauvage" },
  { name: "birmarket-product", url: "https://birmarket.az/product/396858-tualet-suyu-dior-sauvage-100-ml" },
  {
    name: "lalafo-search",
    url: "https://lalafo.az/azerbaijan/krasota-i-zdorove/parfyumeriya-2/q-dior-sauvage-100ml-qiymeti",
  },
  { name: "tapaz-search", url: "https://tap.az/elanlar?keywords=dior+sauvage" },
  { name: "aromi-product", url: "https://aromi.az/kisi-ucun-etir/christian-dior-sauvage/" },
  {
    name: "parfumshop-product",
    url: "https://www.parfumshop.az/index.php?route=product/product&product_id=7076",
  },
  { name: "kontakt-product", url: "https://kontakt.az/iphone-15-128-gb-black" },
  { name: "irshad-product", url: "https://irshad.az/mehsullar/iphone-15-128-gb-black" },
  { name: "bazarstore-home", url: "https://bazarstore.az/" },
  { name: "omid-collection", url: "https://omid.az/collections/yeni-gelen-mehsullar" },
  { name: "arazmarket-home", url: "https://www.arazmarket.az/" },
];

async function get(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,text/plain;q=0.9,*/*;q=0.5",
      "Accept-Language": "az,en;q=0.7",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  return {
    status: res.status,
    finalUrl: res.url,
    type: res.headers.get("content-type") ?? "",
    body: await res.text(),
  };
}

function windows(body: string, pattern: RegExp, count: number, size: number): string[] {
  const out: string[] = [];
  for (const match of body.matchAll(pattern)) {
    const at = match.index ?? 0;
    out.push(body.slice(Math.max(0, at - size / 2), at + size / 2).replace(/\s+/g, " "));
    if (out.length >= count) break;
  }
  return out;
}

async function main() {
  const rulesByHost = new Map<string, RobotsRules | "closed">();
  const hosts = [...new Set(TARGETS.map((t) => new URL(t.url).origin))];
  for (const origin of hosts) {
    try {
      const robots = await get(`${origin}/robots.txt`);
      console.log(`\n## robots ${origin}  status=${robots.status} type=${robots.type}`);
      console.log("```\n" + robots.body.slice(0, 1500) + "\n```");
      if (robots.status >= 500) rulesByHost.set(origin, "closed");
      else if (robots.status >= 400)
        rulesByHost.set(origin, { allow: [], disallow: [], crawlDelaySec: null });
      else rulesByHost.set(origin, parseRobots(robots.body, UA));
    } catch (error) {
      console.log(`\n## robots ${origin}  XƏTA ${error instanceof Error ? error.message : error}`);
      rulesByHost.set(origin, "closed");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  for (const target of TARGETS) {
    const url = new URL(target.url);
    const rules = rulesByHost.get(url.origin);
    console.log(`\n## ${target.name}  ${target.url}`);
    if (!rules || rules === "closed") {
      console.log("robots: alına bilmədi, sorğu göndərilmədi");
      continue;
    }
    if (!isAllowed(rules, url.pathname + url.search)) {
      console.log("robots: QADAĞANDIR, sorğu göndərilmədi");
      continue;
    }
    try {
      const { status, finalUrl, type, body } = await get(target.url);
      const blocked = /just a moment|cf-chl|attention required|captcha|access denied/i.test(
        body.slice(0, 5000),
      );
      console.log(`status=${status} final=${finalUrl} type=${type} bytes=${body.length} blocked=${blocked}`);
      console.log(`title: ${(body.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "").trim()}`);
      console.log(
        `ld+json=${(body.match(/application\/ld\+json/g) ?? []).length} nextData=${body.includes("__NEXT_DATA__")} ` +
          `nuxt=${body.includes("__NUXT__")} shopify=${/cdn\.shopify\.com|Shopify\.theme/.test(body)} ` +
          `ogPrice=${/product:price:amount/.test(body)} productLinks=${(body.match(/\/products?\//g) ?? []).length}`,
      );
      windows(body, /\d[\d\s.,]*\s?(?:₼|AZN|azn|Azn|manat)/g, 3, 360).forEach((w, i) =>
        console.log(`price[${i}]: ${w}`),
      );
      windows(body, /application\/ld\+json/g, 1, 900).forEach((w) => console.log(`ld: ${w}`));
    } catch (error) {
      console.log(`XƏTA ${error instanceof Error ? error.message : error}`);
    }
    const delay = Math.max(2500, (rules.crawlDelaySec ?? 0) * 1000);
    await new Promise((r) => setTimeout(r, delay));
  }
}

main();
