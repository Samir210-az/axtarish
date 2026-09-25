import { db } from "../lib/firebaseAdmin";

const PAGE = 500;

/** Sırf sayım üçün — heç bir Gemini API çağırışı etmir, yalnız Firestore-u oxuyur.
 * Backfill workflow-un faktiki nə qədər irəlilədiyini dəqiq öyrənmək məqsədilə. */
async function main() {
  const firestore = db();
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let total = 0;
  let withEmbedding = 0;

  for (;;) {
    let query = firestore.collection("products").orderBy("__name__").limit(PAGE);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      total += 1;
      const data = doc.data();
      if (Array.isArray(data.embedding) && data.embedding.length > 0) withEmbedding += 1;
    }

    last = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(`say=${total} | embedding_var=${withEmbedding} | embedding_yoxdur=${total - withEmbedding}`);
}

main().catch((error) => {
  console.error("count-embeddings uğursuz oldu:", error);
  process.exitCode = 1;
});
