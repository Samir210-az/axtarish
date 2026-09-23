import { GoogleAuth } from "google-auth-library";
import { Timestamp } from "firebase-admin/firestore";
import { db, parseServiceAccount } from "../lib/firebaseAdmin";

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
  const account = parseServiceAccount(raw);
  const projectId = String(account.project_id);
  console.log(`project=${projectId}`);

  const products = await db().collection("products").limit(5).get();
  console.log(`products nümunə: ${products.size}`);
  const ids = products.docs.map((d) => d.id);

  try {
    const since = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const snap = await db()
      .collection("offers")
      .where("productId", "in", ids)
      .where("effectiveAt", ">=", since)
      .orderBy("effectiveAt", "desc")
      .limit(5)
      .get();
    console.log(`SORĞU UĞURLUDUR: ${snap.size} qiymət`);
  } catch (error) {
    const e = error as { code?: unknown; message?: string };
    console.log(`SORĞU XƏTASI code=${String(e.code)}\n${e.message}`);
  }

  try {
    const auth = new GoogleAuth({
      credentials: account,
      scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/datastore"],
    });
    const client = await auth.getClient();
    const res = await client.request({
      url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/offers/indexes`,
      method: "POST",
      data: {
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "productId", order: "ASCENDING" },
          { fieldPath: "effectiveAt", order: "DESCENDING" },
        ],
      },
    });
    console.log(`İNDEKS YARATMA status=${res.status} ${JSON.stringify(res.data).slice(0, 400)}`);
  } catch (error) {
    const e = error as { code?: unknown; message?: string; response?: { status?: number; data?: unknown } };
    console.log(
      `İNDEKS YARATMA XƏTASI status=${e.response?.status} ${JSON.stringify(e.response?.data ?? e.message).slice(0, 600)}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
