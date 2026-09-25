import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { embedText } from "../lib/embeddings";
import { db } from "../lib/firebaseAdmin";

const PAGE = 100;
const DRY = process.argv.includes("--dry");
const DELAY_MS = Number(process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1] ?? 1500);
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? Infinity);

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sourceTextFor(data: FirebaseFirestore.DocumentData): string {
  const parts = [text(data.brand), text(data.model), text(data.displayName), text(data.category)];
  return parts.filter(Boolean).join(" ").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** embedText 429 (kvota) görəndə null qaytarır — bu skriptdə fərqləndirmək üçün
 * ayrıca, backoff-lu bir çağırış edirik ki, minlərlə sənəd üzərində bir dəfəlik
 * kvota partlayışı bütün əməliyyatı korlamasın. */
async function embedWithRetry(text: string, attempts = 3): Promise<number[] | null> {
  for (let i = 0; i < attempts; i++) {
    const vector = await embedText(text, "RETRIEVAL_DOCUMENT");
    if (vector) return vector;
    if (i < attempts - 1) await sleep(DELAY_MS * (i + 2));
  }
  return null;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY tapılmadı — .env yaxud GitHub secret-i yoxlayın.");
    process.exitCode = 1;
    return;
  }

  const firestore = db();
  let last: QueryDocumentSnapshot | undefined;
  let scanned = 0;
  let updated = 0;
  let skippedHasEmbedding = 0;
  let skippedNoText = 0;
  let failed = 0;

  outer: for (;;) {
    let query = firestore.collection("products").orderBy("__name__").limit(PAGE);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      if (scanned >= LIMIT) break outer;
      scanned += 1;
      const data = doc.data();

      if (Array.isArray(data.embedding) && data.embedding.length > 0) {
        skippedHasEmbedding += 1;
        continue;
      }

      const source = sourceTextFor(data);
      if (source.length === 0) {
        skippedNoText += 1;
        continue;
      }

      const vector = await embedWithRetry(source);
      if (!vector) {
        failed += 1;
        console.warn(`embedding alınmadı: ${doc.id} (${source})`);
        await sleep(DELAY_MS);
        continue;
      }

      if (!DRY) await doc.ref.update({ embedding: vector });
      updated += 1;
      await sleep(DELAY_MS);
    }

    last = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(
    `rejim=${DRY ? "DRY" : "YAZMA"} | baxıldı=${scanned} | ${DRY ? "yaradılacaq" : "yaradıldı"}=${updated} | ` +
      `artıq var idi=${skippedHasEmbedding} | mətnsiz=${skippedNoText} | uğursuz=${failed}`,
  );
}

main().catch((error) => {
  console.error("backfill-embeddings uğursuz oldu:", error);
  process.exitCode = 1;
});
