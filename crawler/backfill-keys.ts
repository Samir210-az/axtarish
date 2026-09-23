import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";
import { searchKeysFor } from "../lib/searchKeys";

const PAGE = 300;
const DRY = process.argv.includes("--dry");

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sameKeys(current: unknown, wanted: string[]): boolean {
  if (!Array.isArray(current) || current.length !== wanted.length) return false;
  const have = new Set(current);
  return wanted.every((key) => have.has(key));
}

async function main() {
  const firestore = db();
  let last: QueryDocumentSnapshot | undefined;
  let scanned = 0;
  let changed = 0;
  let empty = 0;

  for (;;) {
    let query = firestore.collection("products").orderBy("__name__").limit(PAGE);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = firestore.batch();
    let ops = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const aliases = Array.isArray(data.aliases) ? data.aliases.filter((a): a is string => typeof a === "string") : [];
      const keys = searchKeysFor({
        brand: text(data.brand),
        model: text(data.model),
        displayName: text(data.displayName),
        aliases,
      });
      if (keys.length === 0) {
        empty += 1;
        continue;
      }
      if (sameKeys(data.searchKeys, keys)) continue;
      changed += 1;
      if (!DRY) {
        batch.update(doc.ref, { searchKeys: keys });
        ops += 1;
      }
    }
    if (ops > 0) await batch.commit();
    scanned += snapshot.size;
    last = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(
    `rejim=${DRY ? "DRY" : "YAZMA"} | baxıldı=${scanned} | ${DRY ? "dəyişəcək" : "yeniləndi"}=${changed} | açarsız (adı boş)=${empty}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
