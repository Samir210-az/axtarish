import { FieldValue, Timestamp, type DocumentData, type WriteBatch } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";
import { identify } from "./identity";
import { keyDocId } from "./keys";
import { planMerges, type MergeInput } from "./merge";

const DRY = process.argv.includes("--dry");
const BATCH_OPS = 400;
const RECOMPUTE = process.argv.includes("--recompute");

interface ProductRow {
  id: string;
  data: DocumentData;
  gtin: string | null;
  nameKey: string | null;
  previousNameKey: string | null;
}

function nameKeyOf(data: DocumentData): string | null {
  if (!RECOMPUTE && typeof data.nameKey === "string" && data.nameKey) return data.nameKey;
  const found = identify({
    name: String(data.displayName ?? ""),
    brand: typeof data.brand === "string" && data.brand ? data.brand : null,
    sku: null,
    gtin: null,
    priceAzn: 1,
    oldPriceAzn: null,
    availability: "unknown",
    origin: "og",
  });
  return found?.nameKey ?? null;
}

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
  const now = Timestamp.now();

  const snapshot = await firestore.collection("products").limit(5000).get();
  const rows = new Map<string, ProductRow>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.displayName !== "string" || !data.displayName) continue;
    rows.set(doc.id, {
      id: doc.id,
      data,
      gtin: typeof data.gtin === "string" && data.gtin ? data.gtin : null,
      nameKey: nameKeyOf(data),
      previousNameKey: typeof data.nameKey === "string" && data.nameKey ? data.nameKey : null,
    });
  }

  const inputs: MergeInput[] = [...rows.values()].map((r) => ({
    id: r.id,
    gtin: r.gtin,
    nameKey: r.nameKey,
    createdAt: (r.data.createdAt as Timestamp | undefined)?.toMillis?.() ?? 0,
  }));
  const plan = planMerges(inputs);

  const target = new Map<string, string>();
  for (const merge of plan.merges) target.set(merge.from, merge.into);

  const pending = await firestore.collection("product_merges").where("status", "==", "pending").get();
  let pendingUsed = 0;
  for (const doc of pending.docs) {
    const into = String(doc.get("into") ?? "");
    if (doc.id !== into && rows.has(doc.id) && rows.has(into) && !target.has(doc.id)) {
      target.set(doc.id, into);
      pendingUsed += 1;
    }
  }
  const finalOf = (id: string): string => {
    let current = id;
    for (let hops = 0; hops < 10 && target.has(current); hops += 1) current = target.get(current) as string;
    return current;
  };
  const merges = [...target.keys()].map((from) => ({ from, into: finalOf(from) })).filter((m) => m.from !== m.into);

  console.log(
    `rejim=${DRY ? "DRY" : "YAZMA"} | məhsul=${rows.size} | birləşdiriləcək=${merges.length} (növbədən: ${pendingUsed}) | qeyri-müəyyən ad açarı=${plan.ambiguous.length}`,
  );
  for (const m of merges.slice(0, 25)) {
    console.log(`  ${rows.get(m.from)?.data.displayName}  ->  ${rows.get(m.into)?.data.displayName}`);
  }
  for (const a of plan.ambiguous.slice(0, 10)) console.log(`  qeyri-müəyyən: ${a.nameKey} (${a.ids.length} barkodsuz)`);

  let offersMoved = 0;
  for (const m of merges) {
    const from = rows.get(m.from) as ProductRow;
    const offers = await firestore.collection("offers").where("productId", "==", m.from).get();
    const history = await firestore.collection("price_history").where("productId", "==", m.from).get();
    offersMoved += offers.size;
    const ops: ((batch: WriteBatch) => void)[] = [];
    for (const doc of offers.docs) ops.push((batch) => batch.update(doc.ref, { productId: m.into }));
    for (const doc of history.docs) ops.push((batch) => batch.update(doc.ref, { productId: m.into }));
    const aliases = [from.data.displayName, ...(Array.isArray(from.data.aliases) ? from.data.aliases : [])].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    const keys = (Array.isArray(from.data.searchKeys) ? from.data.searchKeys : []).filter(
      (v): v is string => typeof v === "string",
    );
    ops.push((batch) =>
      batch.update(firestore.collection("products").doc(m.into), {
        aliases: FieldValue.arrayUnion(...aliases),
        ...(keys.length > 0 ? { searchKeys: FieldValue.arrayUnion(...keys) } : {}),
        updatedAt: now,
      }),
    );
    ops.push((batch) => batch.delete(firestore.collection("products").doc(m.from)));
    ops.push((batch) =>
      batch.set(
        firestore.collection("product_merges").doc(m.from),
        { into: m.into, status: "done", at: now },
        { merge: true },
      ),
    );
    await runOps(ops);
  }

  const merged = new Set(merges.map((m) => m.from));
  const survivors = [...rows.values()].filter((r) => !merged.has(r.id));
  const nameGroups = new Map<string, ProductRow[]>();
  for (const r of survivors) {
    if (!r.nameKey) continue;
    const list = nameGroups.get(r.nameKey);
    if (list) list.push(r);
    else nameGroups.set(r.nameKey, [r]);
  }

  const wanted: { key: string; kind: "gtin" | "name"; productId: string; gtin: string | null }[] = [];
  for (const r of survivors)
    if (r.gtin) wanted.push({ key: `gtin:${r.gtin}`, kind: "gtin", productId: r.id, gtin: r.gtin });
  for (const [nameKey, group] of nameGroups) {
    if (group.length === 1)
      wanted.push({ key: `name:${nameKey}`, kind: "name", productId: group[0]!.id, gtin: group[0]!.gtin });
  }

  const existing = new Map<string, { productId: string; gtin: string | null }>();
  for (let start = 0; start < wanted.length; start += 300) {
    const slice = wanted.slice(start, start + 300);
    const snaps = await firestore.getAll(
      ...slice.map((w) => firestore.collection("product_keys").doc(keyDocId(w.key))),
    );
    snaps.forEach((snap, index) => {
      if (snap.exists)
        existing.set((slice[index] as { key: string }).key, {
          productId: String(snap.get("productId")),
          gtin: (snap.get("gtin") as string | null) ?? null,
        });
    });
  }
  const toWrite = wanted.filter((w) => {
    const have = existing.get(w.key);
    return !have || have.productId !== w.productId || have.gtin !== w.gtin;
  });
  const keyOps = toWrite.map(
    (w) => (batch: WriteBatch) =>
      batch.set(
        firestore.collection("product_keys").doc(keyDocId(w.key)),
        { key: w.key, kind: w.kind, productId: w.productId, gtin: w.gtin, updatedAt: now },
        { merge: true },
      ),
  );
  const nameOps = survivors
    .filter((r) => r.nameKey && r.data.nameKey !== r.nameKey)
    .map(
      (r) => (batch: WriteBatch) => batch.update(firestore.collection("products").doc(r.id), { nameKey: r.nameKey }),
    );
  const wantedKeys = new Set(wanted.map((w) => w.key));
  const staleRows = RECOMPUTE
    ? [...rows.values()].filter(
        (r) => r.previousNameKey && r.previousNameKey !== r.nameKey && !wantedKeys.has(`name:${r.previousNameKey}`),
      )
    : [];
  const staleOps: ((batch: WriteBatch) => void)[] = [];
  for (let start = 0; start < staleRows.length; start += 300) {
    const slice = staleRows.slice(start, start + 300);
    const snaps = await firestore.getAll(
      ...slice.map((r) => firestore.collection("product_keys").doc(keyDocId(`name:${r.previousNameKey}`))),
    );
    snaps.forEach((snap, index) => {
      if (snap.exists && snap.get("productId") === (slice[index] as ProductRow).id) {
        staleOps.push((batch) => batch.delete(snap.ref));
      }
    });
  }
  await runOps([...keyOps, ...nameOps, ...staleOps]);

  console.log(
    `${DRY ? "yazılacaq" : "yazıldı"}: açar=${toWrite.length} (gtin=${toWrite.filter((w) => w.kind === "gtin").length}, ad=${toWrite.filter((w) => w.kind === "name").length}), ` +
      `nameKey sahəsi=${nameOps.length}, köhnə açar=${staleOps.length}, köçürülən offer=${offersMoved}, qalan məhsul=${survivors.length}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
