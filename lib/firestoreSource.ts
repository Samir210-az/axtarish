import { Timestamp } from "firebase-admin/firestore";
import { MAX_OFFERS_PER_QUERY, MAX_PRODUCTS_IN_INDEX, PRODUCT_INDEX_TTL_MS } from "./config";
import { db } from "./firebaseAdmin";
import { offerDocSchema, productDocSchema } from "./schemas";
import type { Offer, Product } from "./types";

const IN_QUERY_LIMIT = 30;

let productCache: { loadedAt: number; items: Product[] } | null = null;

export async function loadProducts(): Promise<Product[]> {
  const now = Date.now();
  if (productCache && now - productCache.loadedAt < PRODUCT_INDEX_TTL_MS) return productCache.items;

  const snapshot = await db().collection("products").limit(MAX_PRODUCTS_IN_INDEX).get();
  const items: Product[] = [];
  let skipped = 0;
  for (const doc of snapshot.docs) {
    const parsed = productDocSchema.safeParse(doc.data());
    if (parsed.success) items.push({ id: doc.id, ...parsed.data });
    else skipped += 1;
  }
  if (skipped > 0) console.warn(`products: ${skipped} yanlış formatlı sənəd buraxıldı`);

  productCache = { loadedAt: now, items };
  return items;
}

export async function loadOffers(productIds: string[], since: Date): Promise<Offer[]> {
  const sinceTs = Timestamp.fromDate(since);
  const offers: Offer[] = [];
  let skipped = 0;

  for (let i = 0; i < productIds.length; i += IN_QUERY_LIMIT) {
    const chunk = productIds.slice(i, i + IN_QUERY_LIMIT);
    const snapshot = await db()
      .collection("offers")
      .where("productId", "in", chunk)
      .where("effectiveAt", ">=", sinceTs)
      .orderBy("effectiveAt", "desc")
      .limit(MAX_OFFERS_PER_QUERY)
      .get();

    for (const doc of snapshot.docs) {
      const parsed = offerDocSchema.safeParse(doc.data());
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const { effectiveAt, ...rest } = parsed.data;
      offers.push({ id: doc.id, ...rest, effectiveAt: effectiveAt.toDate() });
    }
  }
  if (skipped > 0) console.warn(`offers: ${skipped} yanlış formatlı sənəd buraxıldı`);
  return offers;
}
