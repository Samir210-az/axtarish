const SITES = ["birmarket.az", "kontakt.az", "bakuelectronics.az", "breezy.az", "lalafo.az", "tap.az"];
const UAS: Record<string, string> = {
  plain: "AxtarishBot/0.1 (+https://axtarish-az.vercel.app; price research)",
  compat: "Mozilla/5.0 (compatible; AxtarishBot/0.1; +https://axtarish-az.vercel.app; price research)",
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  try {
    const info = await fetch("https://ipinfo.io/json", { signal: AbortSignal.timeout(15_000) });
    const j = (await info.json()) as Record<string, string>;
    console.log(`runner: ip=${j.ip} country=${j.country} city=${j.city} org=${j.org}`);
  } catch (e) {
    console.log(`runner info XƏTA ${e instanceof Error ? e.message : e}`);
  }
  for (const site of SITES) {
    for (const [name, ua] of Object.entries(UAS)) {
      try {
        const res = await fetch(`https://${site}/`, {
          headers: { "User-Agent": ua, Accept: "text/html" },
          signal: AbortSignal.timeout(20_000),
        });
        const body = await res.text();
        const h = (k: string) => res.headers.get(k) ?? "-";
        console.log(
          `${site} [${name}] status=${res.status} server=${h("server")} cf-mitigated=${h("cf-mitigated")} cf-ray=${res.headers.has("cf-ray")} ` +
            `challenge=${/just a moment|cf-chl/i.test(body.slice(0, 6000))} bytes=${body.length}`,
        );
      } catch (e) {
        console.log(`${site} [${name}] XƏTA ${e instanceof Error ? e.message : e}`);
      }
      await sleep(3000);
    }
  }
}
main();
