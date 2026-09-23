import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";
import { searchKeysFor } from "../lib/searchKeys";
import type { SourceType } from "../lib/types";
import type { Identity } from "./identity";

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
}

const CHUNK = 100;

function offerId(sourceId: string, pageUrl: string): string {
  return createHash("sha1").update(`${sourceId}|${pageUrl}`).digest("hex").slice(0, 24);
}

export async function saveItems(items: SaveItem[]): Promise<SaveSummary> {
  const summary: SaveSummary = { productsNew: 0, productsSeen: 0, offersNew: 0, offersChanged: 0, offersUnchanged: 0 };
  const firestore = db();
  const now = Timestamp.now();

  for (let start = 0; start < items.length; start += CHUNK) {
    const chunk = items.slice(start, start + CHUNK);
    const productRefs = [
      ...new Map(
        chunk.map((i) => [i.identity.productId, firestore.collection("products").doc(i.identity.productId)]),
      ).values(),
    ];
    const offerRefs = chunk.map((i) => firestore.collection("offers").doc(offerId(i.sourceId, i.pageUrl)));

    const productSnaps = await firestore.getAll(...productRefs);
    const offerSnaps = await firestore.getAll(...offerRefs);
    const existingProducts = new Set(productSnaps.filter((s) => s.exists).map((s) => s.id));

    const batch = firestore.batch();
    const handled = new Set<string>();

    for (const item of chunk) {
      const { identity } = item;
      if (!handled.has(identity.productId)) {
        handled.add(identity.productId);
        summary.productsSeen += 1;
        const ref = firestore.collection("products").doc(identity.productId);
        if (existingProducts.has(identity.productId)) {
          const aliasKeys = searchKeysFor({ brand: "", model: "", displayName: identity.displayName, aliases: [] });
          batch.update(ref, {
            aliases: FieldValue.arrayUnion(identity.displayName),
            ...(aliasKeys.length > 0 ? { searchKeys: FieldValue.arrayUnion(...aliasKeys) } : {}),
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
      }
    }

    chunk.forEach((item, index) => {
      const ref = offerRefs[index]!;
      const snap = offerSnaps[index]!;
      const previous = snap.exists ? (snap.get("priceAzn") as number | undefined) : undefined;

      if (!snap.exists) summary.offersNew += 1;
      else if (previous !== item.priceAzn) summary.offersChanged += 1;
      else summary.offersUnchanged += 1;

      if (!snap.exists || previous !== item.priceAzn) {
        batch.set(firestore.collection("price_history").doc(), {
          offerId: ref.id,
          productId: item.identity.productId,
          sourceId: item.sourceId,
          priceAzn: item.priceAzn,
          at: now,
        });
      }

      batch.set(
        ref,
        {
          productId: item.identity.productId,
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
          firstSeenAt: snap.exists ? (snap.get("firstSeenAt") ?? now) : now,
        },
        { merge: true },
      );
    });

    await batch.commit();
  }
  return summary;
}
