import { db } from "../lib/firebaseAdmin";
import { tokensOf } from "../lib/normalize";

const UNIT = new Set(["ml", "g", "gr", "qr", "q", "kq", "kg", "l", "lt", "litr", "gb", "tb"]);

function core(name: string): Set<string> {
  return new Set(tokensOf(name).filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !UNIT.has(t)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function main() {
  const firestore = db();
  const productSnap = await firestore.collection("products").limit(5000).get();
  const offerSnap = await firestore.collection("offers").limit(20000).get();

  const sources = new Map<string, Set<string>>();
  const firstSource = new Map<string, string>();
  for (const doc of offerSnap.docs) {
    const productId = String(doc.get("productId"));
    const sourceId = String(doc.get("sourceId") ?? doc.get("sellerKey"));
    if (!sources.has(productId)) sources.set(productId, new Set());
    sources.get(productId)?.add(sourceId);
    if (!firstSource.has(productId)) firstSource.set(productId, sourceId);
  }

  const histogram = new Map<number, number>();
  let gtinProducts = 0;
  const items: { id: string; name: string; size: string | null; src: string; tokens: Set<string> }[] = [];
  for (const doc of productSnap.docs) {
    const count = sources.get(doc.id)?.size ?? 0;
    histogram.set(count, (histogram.get(count) ?? 0) + 1);
    if (String(doc.get("matchKey") ?? "").startsWith("gtin:")) gtinProducts += 1;
    const name = String(doc.get("displayName") ?? "");
    items.push({
      id: doc.id,
      name,
      size: (doc.get("sizeLabel") as string | null) ?? null,
      src: firstSource.get(doc.id) ?? "?",
      tokens: core(name),
    });
  }
  console.log(`products=${productSnap.size} offers=${offerSnap.size} gtin-açarlı məhsul=${gtinProducts}`);
  console.log(
    `satıcı sayına görə məhsul sayı: ${JSON.stringify([...histogram.entries()].sort((a, b) => a[0] - b[0]))}`,
  );

  const pairs: { j: number; line: string }[] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let k = i + 1; k < items.length; k += 1) {
      const a = items[i]!;
      const b = items[k]!;
      if (a.src === b.src || a.src === "?" || b.src === "?") continue;
      if (a.size === null || a.size !== b.size) continue;
      const j = jaccard(a.tokens, b.tokens);
      if (j >= 0.5)
        pairs.push({ j, line: `${j.toFixed(2)} | ${a.size} | ${a.src}: ${a.name}  <>  ${b.src}: ${b.name}` });
    }
  }
  pairs.sort((x, y) => y.j - x.j);
  console.log(
    `\nfərqli mağaza, eyni ölçü, oxşarlıq >= 0.5: ${pairs.length} cüt (>=0.7: ${pairs.filter((p) => p.j >= 0.7).length})`,
  );
  console.log(
    pairs
      .slice(0, 30)
      .map((p) => p.line)
      .join("\n"),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
