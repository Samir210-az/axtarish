import { Timestamp } from "firebase-admin/firestore";
import { MAX_OFFERS_PER_QUERY, MAX_PRODUCTS_PER_KEY, PRODUCT_CACHE_MAX_ENTRIES, PRODUCT_CACHE_TTL_MS } from "./config";
import { db } from "./firebaseAdmin";
import type { ParsedQuery } from "./normalize";
import { offerDocSchema, productDocSchema } from "./schemas";
import { planProductQuery, type ProductQueryPlan } from "./searchKeys";
import type { Offer, Product } from "./types";

const IN_QUERY_LIMIT = 30;

const productCache = new Map<string, { loadedAt: number; items: Product[] }>();

function cacheKeyOf(plan: ProductQueryPlan): string {
  return plan.kind === "key" ? `k:${plan.key}` : `c:${[...plan.categories].sort().join(",")}`;
}

export async function loadProducts(query: ParsedQuery): Promise<Product[]> {
  const plan = planProductQuery(query);
  if (!plan) return [];

  const cacheKey = cacheKeyOf(plan);
  const now = Date.now();
  const cached = productCache.get(cacheKey);
  if (cached && now - cached.loadedAt < PRODUCT_CACHE_TTL_MS) return cached.items;

  const collection = db().collection("products");
  const snapshot =
    plan.kind === "key"
      ? await collection.where("searchKeys", "array-contains", plan.key).limit(MAX_PRODUCTS_PER_KEY).get()
      : await collection.where("category", "in", plan.categories).limit(MAX_PRODUCTS_PER_KEY).get();
  if (snapshot.size >= MAX_PRODUCTS_PER_KEY)
    console.warn(`products: ${cacheKey} üçün limit dolub (${MAX_PRODUCTS_PER_KEY})`);

  const items: Product[] = [];
  let skipped = 0;
  for (const doc of snapshot.docs) {
    const parsed = productDocSchema.safeParse(doc.data());
    if (parsed.success) items.push({ id: doc.id, ...parsed.data });
    else skipped += 1;
  }
  if (skipped > 0) console.warn(`products: ${skipped} yanlış formatlı sənəd buraxıldı`);

  productCache.delete(cacheKey);
  productCache.set(cacheKey, { loadedAt: now, items });
  while (productCache.size > PRODUCT_CACHE_MAX_ENTRIES) {
    const oldest = productCache.keys().next().value;
    if (oldest === undefined) break;
    productCache.delete(oldest);
  }
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
      if (parsed.data.status !== "active") continue;
      const { effectiveAt, ...rest } = parsed.data;
      offers.push({ id: doc.id, ...rest, effectiveAt: effectiveAt.toDate() });
    }
  }
  if (skipped > 0) console.warn(`offers: ${skipped} yanlış formatlı sənəd buraxıldı`);
  return offers;
}
