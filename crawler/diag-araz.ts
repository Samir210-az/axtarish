import { PoliteFetcher } from "./http";

const URLS = [
  "https://www.arazmarket.az/az/products/usaq-sabunu-90qr-133",
  "https://www.arazmarket.az/az/products/pure-sense-maye-sabun-breeze-300ml-1016",
];

async function main() {
  const fetcher = new PoliteFetcher();
  for (const url of URLS) {
    const page = await fetcher.get(url);
    if (!page.ok) {
      console.log(`${url}: ${page.reason} ${page.detail}`);
      continue;
    }
    const flat = page.body.replace(/\\"/g, '"').replace(/\\u0026/g, "&");
    const slug = new URL(url).pathname.split("/").pop() as string;
    const at = flat.indexOf(`"slug":"${slug}"`);
    const start = flat.lastIndexOf('"product":{', at);
    console.log(`\n=== ${slug} | product@${start} slug@${at}`);
    console.log(flat.slice(start, start + 1600));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
