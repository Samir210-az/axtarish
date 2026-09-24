import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";
import { searchKeysFor } from "../lib/searchKeys";
import type { SourceType } from "../lib/types";
import type { Identity } from "./identity";
import { keyDocId, keysOf, resolveIdentity, type KnownKey } from "./keys";

export interface SaveItem {
  identity: Identity;
  pageUrl: string;
  priceAzn: number;
  oldPriceAzn: number | null;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
}

export interface SaveSummary {
  productsNew: number;
  productsSeen: number;
  offersNew: number;
  offersChanged: number;
  offersUnchanged: number;
  conflicts: number;
}

const CHUNK = 60;

function offerId(sourceId: string, pageUrl: string): string {
  return createHash("sha1").update(`${sourceId}|${pageUrl}`).digest("hex").slice(0, 24);
}

export async function saveItems(items: SaveItem[]): Promise<SaveSummary> {
  const summary: SaveSummary = {
    productsNew: 0,
    productsSeen: 0,
    offersNew: 0,
    offersChanged: 0,
    offersUnchanged: 0,
    conflicts: 0,
  };
  const firestore = db();
  const now = Timestamp.now();
  const known = new Map<string, KnownKey>();

  for (let start = 0; start < items.length; start += CHUNK) {
    const chunk = items.slice(start, start + CHUNK);

    const unknownKeys = [...new Set(chunk.flatMap((i) => keysOf(i.identity)))].filter((key) => !known.has(key));
    if (unknownKeys.length > 0) {
      const keySnaps = await firestore.getAll(
        ...unknownKeys.map((key) => firestore.collection("product_keys").doc(keyDocId(key))),
      );
      keySnaps.forEach((snap, index) => {
        if (!snap.exists) return;
        known.set(unknownKeys[index] as string, {
          productId: String(snap.get("productId")),
          gtin: (snap.get("gtin") as string | null) ?? null,
        });
      });
    }
    const resolved = chunk.map((item) => resolveIdentity(item.identity, known));

    const productIds = [...new Set(resolved.map((r) => r.productId))];
    const productRefs = productIds.map((id) => firestore.collection("products").doc(id));
    const offerRefs = chunk.map((i) => firestore.collection("offers").doc(offerId(i.sourceId, i.pageUrl)));

    const productSnaps = await firestore.getAll(...productRefs);
    const offerSnaps = await firestore.getAll(...offerRefs);
    const existingProducts = new Set(productSnaps.filter((s) => s.exists).map((s) => s.id));

    const batch = firestore.batch();
    const handled = new Set<string>();

    chunk.forEach((item, index) => {
      const { identity } = item;
      const resolution = resolved[index]!;
      const productId = resolution.productId;

      for (const entry of resolution.registered) {
        batch.set(
          firestore.collection("product_keys").doc(keyDocId(entry.key)),
          { key: entry.key, kind: entry.kind, productId, gtin: entry.gtin, updatedAt: now },
          { merge: true },
        );
      }
      if (resolution.conflictWith) {
        summary.conflicts += 1;
        batch.set(
          firestore.collection("product_merges").doc(resolution.conflictWith),
          { into: productId, status: "pending", at: now },
          { merge: true },
        );
      }

      if (handled.has(productId)) return;
      handled.add(productId);
      summary.productsSeen += 1;
      const ref = firestore.collection("products").doc(productId);
      if (existingProducts.has(productId)) {
        const aliasKeys = searchKeysFor({ brand: "", model: "", displayName: identity.displayName, aliases: [] });
        batch.update(ref, {
          aliases: FieldValue.arrayUnion(identity.displayName),
          ...(aliasKeys.length > 0 ? { searchKeys: FieldValue.arrayUnion(...aliasKeys) } : {}),
          ...(resolution.adoptGtin ? { gtin: identity.gtin } : {}),
          updatedAt: now,
        });
      } else {
        summary.productsNew += 1;
        batch.set(ref, {
          displayName: identity.displayName,
          brand: identity.brand,
          model: identity.model,
          category: identity.category,
          variant: identity.variant,
          volumeMl: identity.volumeMl,
          sizeLabel: identity.sizeLabel,
          gtin: identity.gtin,
          matchKey: identity.matchKey,
          nameKey: identity.nameKey,
          aliases: [identity.displayName],
          searchKeys: searchKeysFor({
            brand: identity.brand,
            model: identity.model,
            displayName: identity.displayName,
            aliases: [identity.displayName],
          }),
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    chunk.forEach((item, index) => {
      const ref = offerRefs[index]!;
      const snap = offerSnaps[index]!;
      const productId = resolved[index]!.productId;
      const previous = snap.exists ? (snap.get("priceAzn") as number | undefined) : undefined;
      const changed = !snap.exists || previous !== item.priceAzn;

      if (!snap.exists) summary.offersNew += 1;
      else if (previous !== item.priceAzn) summary.offersChanged += 1;
      else summary.offersUnchanged += 1;

      if (changed) {
        batch.set(firestore.collection("price_history").doc(), {
          offerId: ref.id,
          productId,
          sourceId: item.sourceId,
          priceAzn: item.priceAzn,
          at: now,
        });
      }

      batch.set(
        ref,
        {
          productId,
          priceAzn: item.priceAzn,
          oldPriceAzn: item.oldPriceAzn,
          authenticity: item.identity.authenticity,
          sourceType: item.sourceType,
          sellerType: "store",
          sellerKey: `store:${item.sourceId}`,
          sellerName: item.sourceName,
          sellerUrl: item.pageUrl,
          sourceId: item.sourceId,
          effectiveAt: now,
          priceChangedAt: changed ? now : (snap.get("priceChangedAt") ?? snap.get("firstSeenAt") ?? now),
          status: "active",
          firstSeenAt: snap.exists ? (snap.get("firstSeenAt") ?? now) : now,
        },
        { merge: true },
      );
    });

    await batch.commit();
  }
  return summary;
}
