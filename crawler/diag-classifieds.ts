import { PoliteFetcher } from "./http";
import { collectProductUrls } from "./sitemap";

const SITES = ["https://laylo.az", "https://tapal.az", "https://ucuztap.az", "https://tezbazar.az"];

const pick = (b: string, re: RegExp): string => (re.exec(b)?.[1] ?? "-").replace(/\s+/g, " ").slice(0, 170);

function types(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const t of (m[1] ?? "").matchAll(/"@type"\s*:\s*"([^"]+)"/g)) out.add(t[1] as string);
  }
  return [...out];
}

async function main() {
  for (const origin of SITES) {
    console.log(`\n===== ${origin}`);
    const fetcher = new PoliteFetcher();
    const declared = await fetcher.sitemapsFor(origin);
    const home = await fetcher.get(`${origin}/`);
    if (home.ok) {
      console.log(`title: ${pick(home.body, /<title[^>]*>([\s\S]*?)<\/title>/i)}`);
      console.log(
        `meta description: ${pick(home.body, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)}`,
      );
      console.log(`ld+json tipləri (ana səhifə): ${JSON.stringify(types(home.body))}`);
      const b = home.body;
      const mention = (needle: RegExp) => (b.match(needle) ?? []).length;
      console.log(
        `tap.az xatırlanması=${mention(/tap\.az/gi)}, birmarket=${mention(/birmarket/gi)}, "mənbə/source"=${mention(/mənbə|source:/gi)}`,
      );
    }

    let target: string | null = null;
    if (declared.length > 0) {
      const entries = await collectProductUrls(fetcher, declared, /./, { maxSitemaps: 6, maxUrls: 400 });
      console.log(
        `sitemap ünvanları (ilk 400 həddi): ${entries.length}; nümunə: ${entries
          .slice(0, 3)
          .map((e) => e.loc)
          .join(" | ")}`,
      );
      const adLike = entries.filter((e) => /\d{4,}/.test(e.loc));
      console.log(`rəqəmli (elan kimi) ünvan sayı=${adLike.length}; lastmod nümunəsi=${adLike[0]?.lastmod ?? "-"}`);
      target = (adLike[Math.floor(adLike.length / 2)] ?? entries[Math.floor(entries.length / 2)])?.loc ?? null;
    } else if (home.ok) {
      const link = [...home.body.matchAll(/href="(https?:\/\/tezbazar\.az\/[^"]*-\d{5,}\.html)"/g)][3]?.[1];
      target = link ?? null;
    }
    if (!target) {
      console.log("elan ünvanı seçilmədi");
      continue;
    }
    const page = await fetcher.get(target);
    if (!page.ok) {
      console.log(`elan ${target}: ${page.reason} ${page.detail}`);
      continue;
    }
    const p = page.body;
    console.log(`ELAN ${page.url} (${p.length} bayt)`);
    console.log(`  title: ${pick(p, /<title[^>]*>([\s\S]*?)<\/title>/i)}`);
    console.log(`  ld+json tipləri: ${JSON.stringify(types(p))}`);
    console.log(
      `  qiymət: ${JSON.stringify([...p.matchAll(/(\d[\d\s]{0,9})\s*(?:₼|AZN|Azn|azn)/g)].slice(0, 3).map((m) => m[0]))}`,
    );
    console.log(
      `  tarix: ${JSON.stringify([...p.matchAll(/(\d{2}\.\d{2}\.\d{4}|Bu gün|Dünən|\d{4}-\d{2}-\d{2})/g)].slice(0, 3).map((m) => m[0]))}`,
    );
    console.log(
      `  satıcı növü sözləri: ${JSON.stringify(["Şirkət", "Mağaza", "Fərdi", "Sahibkar", "Vasitəçi", "Agentlik", "Mülkiyyətçi"].filter((w) => p.includes(w)))}`,
    );
    console.log(
      `  tap.az=${(p.match(/tap\.az/gi) ?? []).length}, birmarket=${(p.match(/birmarket/gi) ?? []).length}, telefon=${/tel:|\+994|\b05[015567][\s-]?\d{3}/.test(p)}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
