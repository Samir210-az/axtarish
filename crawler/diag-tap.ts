import { PoliteFetcher } from "./http";

function top(map: Map<string, number>, n: number): string {
  return JSON.stringify([...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n));
}

async function main() {
  const fetcher = new PoliteFetcher();
  for (const n of [1, 30, 61]) {
    const url = `https://tap.azstatic.com/uploads/attachment/20260924_sitemap_az_${n}.xml`;
    const res = await fetcher.get(url);
    if (!res.ok) {
      console.log(`\n#${n}: ${res.reason} ${res.detail}`);
      continue;
    }
    const urls = [...res.body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1] as string);
    console.log(`\n#${n}: ${res.body.length} simvol, ${urls.length} ünvan (3M simvol həddində kəsilə bilər)`);
    const seg1 = new Map<string, number>();
    const seg2 = new Map<string, Map<string, number>>();
    for (const u of urls) {
      let parts: string[] = [];
      try {
        parts = new URL(u).pathname.split("/").filter(Boolean);
      } catch {
        continue;
      }
      const a = parts[0] ?? "(kök)";
      seg1.set(a, (seg1.get(a) ?? 0) + 1);
      if (parts[1]) {
        const m = seg2.get(a) ?? new Map<string, number>();
        m.set(parts[1], (m.get(parts[1]) ?? 0) + 1);
        seg2.set(a, m);
      }
    }
    console.log(`1-ci seqment: ${top(seg1, 25)}`);
    for (const [a] of [...seg1.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4)) {
      console.log(`  ${a}/ altında 2-ci seqment: ${top(seg2.get(a) ?? new Map(), 30)}`);
    }
    const step = Math.max(1, Math.floor(urls.length / 6));
    console.log(
      `nümunə: ${Array.from({ length: 6 }, (_, i) => urls[i * step])
        .filter(Boolean)
        .join("\n  ")}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
