import { isAllowed, parseRobots } from "./robots";

const URL_TO_TEST = "https://birmarket.az/categories/15-noutbuklar-ve-komputer-texnikasi?view=categories";
const UAS: Record<string, string> = {
  compat: "Mozilla/5.0 (compatible; AxtarishBot/0.1; +https://axtarish-az.vercel.app; price research)",
  plain: "AxtarishBot/0.1 (+https://axtarish-az.vercel.app; price research)",
};

async function main() {
  const u = new URL(URL_TO_TEST);
  const robots = await fetch(`${u.origin}/robots.txt`, { headers: { "User-Agent": UAS.compat! } });
  const text = await robots.text();
  const rules = parseRobots(text, UAS.compat!);
  console.log(`robots status=${robots.status} disallow(${rules.disallow.length}): ${rules.disallow.join("  ")}`);
  console.log(`allow: ${rules.allow.join("  ") || "-"}  delay=${rules.crawlDelaySec ?? "-"}`);
  console.log(`isAllowed(${u.pathname + u.search}) = ${isAllowed(rules, u.pathname + u.search)}`);
  console.log(`isAllowed(/) = ${isAllowed(rules, "/")}  isAllowed(/product/1-x) = ${isAllowed(rules, "/product/1-x")}`);

  for (const [name, ua] of Object.entries(UAS)) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(URL_TO_TEST, { headers: { "User-Agent": ua, Accept: "text/html" } });
    const body = await res.text();
    const products = body.match(/\/product\/\d+-/g) ?? [];
    console.log(
      `[${name}] status=${res.status} server=${res.headers.get("server")} bytes=${body.length} ` +
        `tapilan=${/Tapılan məhsul/.test(body)} productLinks=${products.length}`,
    );
    if (res.status !== 200) console.log(`body: ${body.slice(0, 300).replace(/\s+/g, " ")}`);
  }
}
main();
