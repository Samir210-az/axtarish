import { PoliteFetcher } from "./http";

function contexts(body: string, re: RegExp, max: number, radius = 90): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(re)) {
    const at = m.index ?? 0;
    out.push(body.slice(Math.max(0, at - radius), at + radius).replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const fetcher = new PoliteFetcher();

  const uc = await fetcher.get("https://ucuztap.az/elanlar");
  if (uc.ok) {
    const b = uc.body;
    const all = (b.match(/tap\.az/gi) ?? []).length;
    const hrefs = (b.match(/href="https?:\/\/(?:www\.)?tap\.az[^"]*"/gi) ?? []).length;
    const srcs = (b.match(/src="[^"]*tap\.az[^"]*"/gi) ?? []).length;
    const own = (b.match(/ucuztap\.az/gi) ?? []).length;
    console.log(
      `UCUZTAP /elanlar: ${b.length} bayt; tap.az=${all}, o cümlədən href=${hrefs}, src=${srcs}; ucuztap.az=${own}`,
    );
    console.log(`kontekstlər:\n  ${contexts(b, /tap\.az/gi, 8).join("\n  ---\n  ")}`);
    console.log(`"mənbə" kontekstləri:\n  ${contexts(b, /mənbə|Mənbə|source/g, 3).join("\n  ---\n  ")}`);
  } else {
    console.log(`ucuztap: ${uc.reason} ${uc.detail}`);
  }

  const tp = await fetcher.get("https://tapal.az/elan/249-epson-m3170-mono-printer");
  if (tp.ok) {
    const b = tp.body;
    const offer = /"@type"\s*:\s*"Offer"[\s\S]{0,400}/.exec(b)?.[0]?.replace(/\s+/g, " ") ?? "-";
    console.log(`\nTAPAL Offer bloku: ${offer.slice(0, 380)}`);
    console.log(`Tapal seller/Person: ${JSON.stringify(contexts(b, /"@type"\s*:\s*"Person"/g, 1, 120))}`);
  } else {
    console.log(`tapal: ${tp.reason} ${tp.detail}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
