import { SOURCES } from "./sources";
import { isAllowed, parseRobots, type RobotsRules } from "./robots";

const UA = "Mozilla/5.0 (compatible; AxtarishBot/0.1; +https://axtarish-az.vercel.app; price research)";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

function platform(body: string): string[] {
  const tags: string[] = [];
  const rules: Array<[string, RegExp]> = [
    ["shopify", /cdn\.shopify\.com|Shopify\.theme/],
    ["magento", /Magento_|mage\/cookies|static\/version\d+\/frontend/],
    ["opencart", /catalog\/view\/theme|route=common\/home/],
    ["woocommerce", /woocommerce/i],
    ["wordpress", /wp-content|wp-includes/],
    ["prestashop", /prestashop/i],
    ["bitrix", /bitrix/i],
    ["nextjs", /__NEXT_DATA__|_next\/static/],
    ["nuxt", /__NUXT__|_nuxt\//],
    ["laravel", /csrf-token/i],
  ];
  for (const [name, pattern] of rules) if (pattern.test(body)) tags.push(name);
  return tags;
}

function priceWindow(body: string): string {
  const match = /\d[\d\s.,]*\s?(?:₼|AZN|azn|Azn|manat)/.exec(body);
  if (!match) return "";
  const at = match.index;
  return body.slice(Math.max(0, at - 160), at + 160).replace(/\s+/g, " ");
}

async function main() {
  const rulesByHost = new Map<string, { rules: RobotsRules | "closed"; summary: string }>();
  const active = SOURCES.filter((s) => s.plan !== "excluded");
  const hosts = [
    ...new Set(active.flatMap((s) => [s.url, ...(s.samples ?? [])].map((u) => new URL(u).origin))),
  ];

  for (const origin of hosts) {
    try {
      const robots = await get(`${origin}/robots.txt`);
      const looksLikeRobots =
        /user-agent|disallow|sitemap/i.test(robots.body.slice(0, 4000)) &&
        !/<html/i.test(robots.body.slice(0, 300));
      const summary = `robots.txt status=${robots.status} robotsFormat=${looksLikeRobots}`;
      if (robots.status >= 500) rulesByHost.set(origin, { rules: "closed", summary });
      else if (robots.status >= 400 || !looksLikeRobots)
        rulesByHost.set(origin, { rules: { allow: [], disallow: [], crawlDelaySec: null }, summary });
      else {
        const rules = parseRobots(robots.body, UA);
        rulesByHost.set(origin, {
          rules,
          summary: `${summary} disallow=${rules.disallow.length} delay=${rules.crawlDelaySec ?? "-"}`,
        });
        if (rules.disallow.length > 0)
          console.log(`\n[robots ${origin}] disallow nümunə: ${rules.disallow.slice(0, 12).join("  ")}`);
      }
    } catch (error) {
      rulesByHost.set(origin, {
        rules: "closed",
        summary: `robots.txt XƏTA ${error instanceof Error ? error.message : error}`,
      });
    }
    await sleep(1500);
  }

  for (const source of active) {
    console.log(`\n### ${source.id} | ${source.name} | ${source.kind}`);
    const urls = [source.url, ...(source.samples ?? [])];
    for (const raw of urls) {
      const url = new URL(raw);
      const host = rulesByHost.get(url.origin);
      const label = raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
      if (!host || host.rules === "closed") {
        console.log(`- ${label}\n  ${host?.summary ?? "robots yoxdur"} -> sorğu göndərilmədi`);
        continue;
      }
      if (!isAllowed(host.rules, url.pathname + url.search)) {
        console.log(`- ${label}\n  ${host.summary} -> robots QADAĞAN edir, sorğu göndərilmədi`);
        continue;
      }
      try {
        const { status, finalUrl, body } = await get(raw);
        const blocked =
          /just a moment|cf-chl|attention required|captcha|access denied|enable javascript/i.test(
            body.slice(0, 6000),
          );
        const title = (body.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "").trim().slice(0, 90);
        console.log(
          `- ${label}\n  ${host.summary} -> status=${status} bytes=${body.length} blocked=${blocked} moved=${finalUrl !== raw}`,
        );
        console.log(
          `  platform=[${platform(body).join(",")}] ldProduct=${/"@type"\s*:\s*"Product"/.test(body)} ogPrice=${/product:price:amount/.test(body)} ` +
            `itempropPrice=${/itemprop="price"/.test(body)} priceInHtml=${(body.match(/\d[\d\s.,]*\s?(?:₼|AZN|azn|Azn)/g) ?? []).length}`,
        );
        console.log(`  title: ${title}`);
        if (raw !== source.url) console.log(`  price: ${priceWindow(body)}`);
      } catch (error) {
        console.log(`- ${label}\n  XƏTA ${error instanceof Error ? error.message : error}`);
      }
      await sleep(Math.max(2500, (host.rules.crawlDelaySec ?? 0) * 1000));
    }
  }
}

main();
