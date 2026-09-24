import { db } from "../lib/firebaseAdmin";

async function count(name: string, where?: [string, "==", string]): Promise<number> {
  let query: FirebaseFirestore.Query = db().collection(name);
  if (where) query = query.where(...where);
  return (await query.count().get()).data().count;
}

async function main() {
  const firestore = db();
  console.log(
    `products=${await count("products")} offers=${await count("offers")} price_history=${await count("price_history")} product_keys=${await count("product_keys")}`,
  );
  console.log(
    `search_queue: pending=${await count("search_queue", ["status", "==", "pending"])} done=${await count("search_queue", ["status", "==", "done"])}`,
  );

  const offers = await firestore.collection("offers").limit(20000).get();
  const bySource = new Map<
    string,
    { total: number; active: number; gone: number; sold: number; oldest: number; newest: number }
  >();
  const sellers = new Map<string, Set<string>>();
  for (const doc of offers.docs) {
    const source = String(doc.get("sourceId") ?? doc.get("sellerKey"));
    const status = String(doc.get("status") ?? "active");
    const at = (doc.get("effectiveAt") as FirebaseFirestore.Timestamp | undefined)?.toMillis() ?? 0;
    const row = bySource.get(source) ?? { total: 0, active: 0, gone: 0, sold: 0, oldest: Infinity, newest: 0 };
    row.total += 1;
    if (status === "active") row.active += 1;
    else if (status === "gone") row.gone += 1;
    else row.sold += 1;
    row.oldest = Math.min(row.oldest, at);
    row.newest = Math.max(row.newest, at);
    bySource.set(source, row);
    if (status === "active") {
      const key = String(doc.get("productId"));
      if (!sellers.has(key)) sellers.set(key, new Set());
      sellers.get(key)?.add(source);
    }
  }
  const day = (ms: number) =>
    Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString().slice(0, 16).replace("T", " ") : "-";
  console.log("\nmənbə | offer cəmi | aktiv | gone | stokda yox | ən köhnə yoxlama | ən yeni yoxlama");
  for (const [source, r] of [...bySource.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`${source} | ${r.total} | ${r.active} | ${r.gone} | ${r.sold} | ${day(r.oldest)} | ${day(r.newest)}`);
  }
  const hist = new Map<number, number>();
  for (const set of sellers.values()) hist.set(set.size, (hist.get(set.size) ?? 0) + 1);
  console.log(
    `\naktiv məhsul sayı satıcı sayına görə: ${JSON.stringify([...hist.entries()].sort((a, b) => a[0] - b[0]))}`,
  );

  const state = await firestore.collection("crawl_state").get();
  console.log("\nkataloq kursoru: mənbə | kursor | mənbədə ünvan | son işdə baxılan | yenilənmə");
  for (const doc of state.docs) {
    const at = (doc.get("updatedAt") as FirebaseFirestore.Timestamp | undefined)?.toMillis() ?? 0;
    console.log(`${doc.id} | ${doc.get("cursor")} | ${doc.get("total")} | ${doc.get("lastProcessed")} | ${day(at)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
