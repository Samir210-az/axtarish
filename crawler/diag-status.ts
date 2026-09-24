import { db } from "../lib/firebaseAdmin";
import { markOffers } from "./store";

async function main() {
  const snap = await db().collection("offers").where("sourceId", "==", "arazmarket").limit(1).get();
  const doc = snap.docs[0];
  if (!doc) throw new Error("test üçün offer tapılmadı");
  const sourceId = String(doc.get("sourceId"));
  const pageUrl = String(doc.get("sellerUrl"));
  console.log(`test offer=${doc.id} status_əvvəl=${String(doc.get("status"))}`);

  console.log(
    `mövcud olmayan offer -> dəyişiklik=${await markOffers([{ sourceId, pageUrl: "https://example.invalid/none", status: "gone" }])} (0 gözlənilir)`,
  );
  try {
    console.log(
      `gone edildi -> dəyişiklik=${await markOffers([{ sourceId, pageUrl, status: "gone" }])} (1 gözlənilir), status=${String((await doc.ref.get()).get("status"))}`,
    );
    console.log(
      `təkrar gone -> dəyişiklik=${await markOffers([{ sourceId, pageUrl, status: "gone" }])} (0 gözlənilir)`,
    );
  } finally {
    console.log(
      `active qaytarıldı -> dəyişiklik=${await markOffers([{ sourceId, pageUrl, status: "active" }])} (1 gözlənilir), status=${String((await doc.ref.get()).get("status"))}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
