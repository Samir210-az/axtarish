import { PoliteFetcher } from "./http";
import { collectProductUrls } from "./sitemap";
import { SOURCES } from "./sources";

async function inspectSource(id: string): Promise<string[]> {
  const source = SOURCES.find((s) => s.id === id);
  if (!source) return [`${id}: reyestrdə yoxdur`];
  const fetcher = new PoliteFetcher();
  const origin = new URL(source.url).origin;
  const declared = await fetcher.sitemapsFor(origin);
  const pattern = new RegExp(source.productUrlPattern ?? "/products?/");
  const entries = await collectProductUrls(
    fetcher,
    declared.length > 0 ? declared : [`${origin}/sitemap.xml`],
    pattern,
    {
      maxSitemaps: 30,
      maxUrls: 60000,
    },
  );
  const stamped = entries
    .filter((e) => e.lastmod)
    .map((e) => ({ loc: e.loc, t: Date.parse(e.lastmod as string) }))
    .filter((e) => Number.isFinite(e.t));
  const now = Date.now();
  const within = (days: number) => stamped.filter((e) => now - e.t <= days * 86_400_000).length;
  const times = stamped.map((e) => e.t).sort((a, b) => a - b);
  const distinctDays = new Set(stamped.map((e) => new Date(e.t).toISOString().slice(0, 10))).size;
  return [
    `\n## ${id}: ünvan=${entries.length}, lastmod olan=${stamped.length}`,
    stamped.length === 0
      ? "lastmod yoxdur"
      : `ən köhnə=${new Date(times[0] as number).toISOString().slice(0, 10)} ən yeni=${new Date(times[times.length - 1] as number).toISOString().slice(0, 10)} fərqli gün sayı=${distinctDays}`,
    stamped.length === 0
      ? ""
      : `son 1 gün=${within(1)} | 7 gün=${within(7)} | 30 gün=${within(30)} | 90 gün=${within(90)}`,
    ...entries.slice(0, 3).map((e) => `  nümunə: ${e.loc} lastmod=${e.lastmod ?? "-"}`),
  ];
}

async function main() {
  const results = await Promise.all(
    ["bazarstore", "arazmarket", "omid", "yvesrocher"].map((id) =>
      inspectSource(id).catch((e) => [`${id}: XƏTA ${e instanceof Error ? e.message : e}`]),
    ),
  );
  results.flat().forEach((line) => console.log(line));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
