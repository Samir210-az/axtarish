import { db } from "../lib/firebaseAdmin";
import { tokensOf } from "../lib/normalize";

const UNIT = new Set(["ml", "g", "gr", "qr", "q", "kq", "kg", "l", "lt", "litr", "gb", "tb"]);

function core(name: string): string[] {
  return [...new Set(tokensOf(name).filter((t) => t.length >= 1 && !/^\d+$/.test(t) && !UNIT.has(t)))];
}

async function main() {
  const firestore = db();
  const products = await firestore.collection("products").limit(5000).get();
  const offers = await firestore.collection("offers").limit(20000).get();
  const sourcesOf = new Map<string, Set<string>>();
  for (const doc of offers.docs) {
    if ((doc.get("status") ?? "active") !== "active") continue;
    const id = String(doc.get("productId"));
    if (!sourcesOf.has(id)) sourcesOf.set(id, new Set());
    sourcesOf.get(id)?.add(String(doc.get("sourceId")));
  }

  const items = products.docs
    .map((d) => ({
      id: d.id,
      name: String(d.get("displayName") ?? ""),
      size: (d.get("sizeLabel") as string | null) ?? null,
      src: [...(sourcesOf.get(d.id) ?? [])],
    }))
    .filter((p) => p.size !== null && p.src.length === 1)
    .map((p) => ({ ...p, tokens: core(p.name) }));

  const bySize = new Map<string, typeof items>();
  for (const it of items) {
    const list = bySize.get(it.size as string);
    if (list) list.push(it);
    else bySize.set(it.size as string, [it]);
  }

  const subst = new Map<string, { count: number; example: string }>();
  const pairs: { score: number; line: string }[] = [];
  for (const group of bySize.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let k = i + 1; k < group.length; k += 1) {
        const a = group[i]!;
        const b = group[k]!;
        if (a.src[0] === b.src[0]) continue;
        const sa = new Set(a.tokens);
        const sb = new Set(b.tokens);
        const da = a.tokens.filter((t) => !sb.has(t));
        const db_ = b.tokens.filter((t) => !sa.has(t));
        const inter = a.tokens.length - da.length;
        const union = a.tokens.length + b.tokens.length - inter;
        const jac = union === 0 ? 0 : inter / union;
        if (jac < 0.5 || inter < 2) continue;
        pairs.push({
          score: jac,
          line: `${jac.toFixed(2)} | ${a.size} | ${a.src[0]}: ${a.name}  <>  ${b.src[0]}: ${b.name}`,
        });
        let key: string | null = null;
        if (da.length === 1 && db_.length === 1) key = [da[0], db_[0]].sort().join(" <-> ");
        else if (da.length === 0 && db_.length === 1) key = `(yoxdur) <-> ${db_[0]}`;
        else if (db_.length === 0 && da.length === 1) key = `(yoxdur) <-> ${da[0]}`;
        if (key) {
          const cur = subst.get(key) ?? { count: 0, example: `${a.name} | ${b.name}` };
          cur.count += 1;
          subst.set(key, cur);
        }
      }
    }
  }
  console.log(`tək mənbəli, ölçüsü məlum məhsul=${items.length}; oxşar cüt (>=0.5, ortaq>=2)=${pairs.length}`);
  console.log("\nƏN ÇOX TƏKRARLANAN FƏRQLƏR (say | fərq | nümunə):");
  for (const [key, v] of [...subst.entries()].sort((x, y) => y[1].count - x[1].count).slice(0, 45)) {
    console.log(`${v.count} | ${key} | ${v.example.slice(0, 110)}`);
  }
  console.log("\nNÜMUNƏ CÜTLƏR (ən oxşar 25):");
  console.log(
    pairs
      .sort((x, y) => y.score - x.score)
      .slice(0, 25)
      .map((p) => p.line)
      .join("\n"),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
