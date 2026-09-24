import { db } from "../lib/firebaseAdmin";
import { PoliteFetcher } from "./http";
import { collectProductUrls } from "./sitemap";
import { SOURCES } from "./sources";

function around(body: string, needle: RegExp, max: number, radius = 220): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(needle)) {
    const at = m.index ?? 0;
    out.push(body.slice(Math.max(0, at - radius), at + radius).replace(/\s+/g, " "));
    if (out.length >= max) break;
  }
  return out;
}

async function counts() {
  console.log("=== BAZADAKI QİYMƏTLƏR (bütün vaxt) ===");
  for (const id of ["bazarstore", "arazmarket", "omid", "yvesrocher", "parfumshop", "almali", "bravo"]) {
    const snap = await db().collection("offers").where("sourceId", "==", id).count().get();
    console.log(`offers[${id}] = ${snap.data().count}`);
  }
  const products = await db().collection("products").count().get();
  console.log(`products = ${products.data().count}`);
}

async function bravo() {
  const source = SOURCES.find((s) => s.id === "bravo");
  if (!source) throw new Error("bravo reyestrdə yoxdur");
  const origin = new URL(source.url).origin;
  const fetcher = new PoliteFetcher();
  const declared = await fetcher.sitemapsFor(origin);
  console.log(`\n=== BRAVO ${origin} sitemaps=${JSON.stringify(declared)}`);
  const entries = await collectProductUrls(fetcher, declared.length > 0 ? declared : [`${origin}/sitemap.xml`], /./, {
    maxSitemaps: 6,
    maxUrls: 4000,
  });
  console.log(`ünvan sayı: ${entries.length}`);
  const groups = new Map<string, number>();
  for (const e of entries) {
    const seg = new URL(e.loc).pathname.split("/").filter(Boolean).slice(0, 1).join("/") || "(kök)";
    groups.set(seg, (groups.get(seg) ?? 0) + 1);
  }
  console.log(`qruplar: ${JSON.stringify([...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10))}`);
  console.log(
    `nümunə:\n  ${entries
      .slice(0, 8)
      .map((e) => e.loc)
      .join("\n  ")}`,
  );

  const target =
    entries.find((e) => new URL(e.loc).pathname.split("/").filter(Boolean).length >= 2)?.loc ??
    entries[0]?.loc ??
    source.url;
  const page = await fetcher.get(target);
  if (!page.ok) {
    console.log(`səhifə alınmadı (${target}): ${page.reason} ${page.detail}`);
    return;
  }
  const body = page.body;
  console.log(`\nSƏHİFƏ ${page.url} bytes=${body.length}`);
  console.log(
    `çərçivə: ${JSON.stringify({ next: /_next\//.test(body), nextF: /__next_f/.test(body), nuxt: /__NUXT__|_nuxt\//.test(body), woo: /woocommerce/i.test(body), shopify: /cdn\.shopify\.com/.test(body), nop: /nopcommerce|data-productid/i.test(body), opencart: /route=product/.test(body) })}`,
  );
  const ld = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log(`ld+json bloklar: ${ld.length}`);
  ld.slice(0, 2).forEach((b, i) => console.log(`--- ld[${i}] ---\n${(b[1] ?? "").trim().slice(0, 1000)}`));
  console.log(
    `meta:\n${[...body.matchAll(/<meta[^>]+(?:price|og:title|product:)[^>]*>/gi)]
      .slice(0, 6)
      .map((m) => m[0])
      .join("\n")}`,
  );
  console.log(`qiymət parçaları:\n  ${around(body, /(₼|AZN|azn|manat)/g, 4, 200).join("\n  ---\n  ")}`);
  const flat = body.replace(/\\"/g, '"');
  console.log(
    `JSON qiymət açarları:\n  ${around(flat, /"(price|salePrice|sale_price|old_price|discount_price|oldPrice|regular_price)"\s*:/gi, 3, 200).join("\n  ---\n  ")}`,
  );
}

async function main() {
  await counts();
  await bravo();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
