import type { WriteBatch } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";
import { isExcludedText, shouldSkipUrl } from "./exclude";

const DRY = process.argv.includes("--dry");
const BATCH_OPS = 400;

async function runOps(ops: ((batch: WriteBatch) => void)[]): Promise<void> {
  if (DRY) return;
  const firestore = db();
  for (let start = 0; start < ops.length; start += BATCH_OPS) {
    const batch = firestore.batch();
    for (const op of ops.slice(start, start + BATCH_OPS)) op(batch);
    await batch.commit();
  }
}

async function main() {
  const firestore = db();
  const products = await firestore.collection("products").limit(5000).get();
  const offers = await firestore.collection("offers").limit(20000).get();

  const names = new Map<string, string>();
  for (const doc of products.docs) names.set(doc.id, String(doc.get("displayName") ?? ""));
  const excludedProducts = new Set([...names].filter(([, name]) => isExcludedText(name)).map(([id]) => id));

  const perProduct = new Map<string, { total: number; excluded: number }>();
  const excludedOffers: {
    ref: FirebaseFirestore.DocumentReference;
    productId: string;
    source: string;
    price: number;
  }[] = [];
  for (const doc of offers.docs) {
    const productId = String(doc.get("productId"));
    const url = String(doc.get("sellerUrl") ?? "");
    const isBad = excludedProducts.has(productId) || (url !== "" && shouldSkipUrl(url));
    const row = perProduct.get(productId) ?? { total: 0, excluded: 0 };
    row.total += 1;
    if (isBad) {
      row.excluded += 1;
      excludedOffers.push({
        ref: doc.ref,
        productId,
        source: String(doc.get("sourceId")),
        price: Number(doc.get("priceAzn")),
      });
    }
    perProduct.set(productId, row);
  }

  const deleteProducts = [...perProduct]
    .filter(([, row]) => row.excluded > 0 && row.excluded === row.total)
    .map(([id]) => id);
  const bySource = new Map<string, number>();
  for (const o of excludedOffers) bySource.set(o.source, (bySource.get(o.source) ?? 0) + 1);

  console.log(
    `rejim=${DRY ? "DRY" : "YAZMA"} | məhsul=${products.size} offer=${offers.size} | silinəcək məhsul=${deleteProducts.length}, offer=${excludedOffers.length}`,
  );
  console.log(`mənbələr üzrə offer: ${JSON.stringify([...bySource.entries()])}`);
  console.log("nümunə (ad | mənbə | qiymət):");
  for (const id of deleteProducts.slice(0, 40)) {
    const offer = excludedOffers.find((o) => o.productId === id);
    console.log(`  ${names.get(id)} | ${offer?.source} | ${offer?.price}`);
  }
  const urlOnly = excludedOffers.filter((o) => !excludedProducts.has(o.productId));
  if (urlOnly.length > 0) console.log(`yalnız ünvana görə (adı normal): ${urlOnly.length} offer`);

  const ops: ((batch: WriteBatch) => void)[] = excludedOffers.map((o) => (batch) => batch.delete(o.ref));
  let historyDeleted = 0;
  let keysDeleted = 0;
  for (const id of deleteProducts) {
    ops.push((batch) => batch.delete(firestore.collection("products").doc(id)));
    const history = await firestore.collection("price_history").where("productId", "==", id).get();
    historyDeleted += history.size;
    for (const doc of history.docs) ops.push((batch) => batch.delete(doc.ref));
    const keys = await firestore.collection("product_keys").where("productId", "==", id).get();
    keysDeleted += keys.size;
    for (const doc of keys.docs) ops.push((batch) => batch.delete(doc.ref));
  }
  await runOps(ops);
  console.log(`${DRY ? "silinəcək" : "silindi"}: tarixçə=${historyDeleted}, açar=${keysDeleted}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
