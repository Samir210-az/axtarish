import { PoliteFetcher } from "./http";
import { collectProductUrls } from "./sitemap";

function names(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const text = m[1] ?? "";
    if (!/BreadcrumbList/.test(text)) continue;
    for (const n of text.matchAll(/"name"\s*:\s*"([^"]+)"/g)) out.push(n[1] as string);
  }
  return out.slice(0, 6);
}

const one = (b: string, re: RegExp): string => (re.exec(b)?.[1] ?? "-").replace(/\s+/g, " ").slice(0, 110);

async function main() {
  const fetcher = new PoliteFetcher();
  const declared = await fetcher.sitemapsFor("https://tapal.az");
  const entries = await collectProductUrls(fetcher, declared, /\/elan\//, { maxSitemaps: 10, maxUrls: 60000 });
  console.log(`sitemap-lar=${declared.length}; /elan/ ünvan sayı=${entries.length}`);
  const step = Math.max(1, Math.floor(entries.length / 10));
  const sample = Array.from({ length: 10 }, (_, i) => entries[Math.min(entries.length - 1, i * step)]).filter(Boolean);
  for (const e of sample) {
    const url = e!.loc;
    const page = await fetcher.get(url);
    if (!page.ok) {
      console.log(`\n${url}: ${page.reason} ${page.detail}`);
      continue;
    }
    const b = page.body;
    console.log(`\n${url.replace("https://tapal.az", "")} | lastmod=${e!.lastmod ?? "-"}`);
    console.log(`  title: ${one(b, /<title[^>]*>([\s\S]*?)<\/title>/i)}`);
    console.log(`  breadcrumb: ${JSON.stringify(names(b))}`);
    console.log(
      `  category(ld): ${one(b, /"category"\s*:\s*"([^"]+)"/)} | condition: ${one(b, /itemCondition"\s*:\s*"https:\/\/schema\.org\/(\w+)/)} | availability: ${one(b, /availability"\s*:\s*"https:\/\/schema\.org\/(\w+)/)} | ld price: ${one(b, /"price"\s*:\s*"([^"]+)"/)}`,
    );
    console.log(
      `  qiymət sözləri: ${JSON.stringify(["Razılaşma", "Qiymət yoxdur", "Pulsuz", "Müqavilə"].filter((w) => b.includes(w)))} | satıcı sözləri: ${JSON.stringify(["Mağaza", "Şirkət", "Vasitəçi", "Agentlik"].filter((w) => b.includes(w)))} | vaxtı bitib=${/vaxtı bitib|deaktiv|arxiv|satılıb/i.test(b)}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
