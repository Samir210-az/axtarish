import { Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";

export interface PendingQuery {
  id: string;
  query: string;
  hits: number;
}

export async function takePending(max: number): Promise<PendingQuery[]> {
  const snapshot = await db().collection("search_queue").where("status", "==", "pending").limit(50).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, query: String(doc.get("query") ?? ""), hits: Number(doc.get("hits") ?? 1) }))
    .filter((item) => item.query)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, max);
}

export async function markDone(id: string, found: number): Promise<void> {
  await db()
    .collection("search_queue")
    .doc(id)
    .set({ status: "done", processedAt: Timestamp.now(), lastFound: found }, { merge: true });
}
