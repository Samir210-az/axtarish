import { Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";

export async function readCursor(sourceId: string): Promise<number> {
  const snapshot = await db().collection("crawl_state").doc(sourceId).get();
  const value = snapshot.get("cursor");
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export async function writeCursor(sourceId: string, cursor: number, total: number, processed: number): Promise<void> {
  await db()
    .collection("crawl_state")
    .doc(sourceId)
    .set({ cursor, total, lastProcessed: processed, updatedAt: Timestamp.now() }, { merge: true });
}
