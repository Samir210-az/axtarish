import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { MAX_QUERY_LENGTH } from "./config";
import { db } from "./firebaseAdmin";
import { parseQuery } from "./normalize";
import type { SearchResponse } from "./types";

const REQUEUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TOKENS = 6;
const MAX_TOKEN_LENGTH = 30;

export function queueKey(query: string): string | null {
  const parsed = parseQuery(query);
  const { tokens } = parsed;
  if (tokens.length === 0 || tokens.length > MAX_TOKENS) return null;
  if (tokens.some((token) => token.length > MAX_TOKEN_LENGTH)) return null;
  if (!tokens.some((token) => /[a-z]{3,}/.test(token))) return null;
  const canonical = `${[...tokens].sort().join(" ")}|${parsed.volumeMl ?? ""}|${parsed.variant ?? ""}`;
  return createHash("sha1").update(canonical).digest("hex").slice(0, 20);
}

export function needsMoreData(data: SearchResponse): boolean {
  if (!data.understood) return false;
  if (data.results.length === 0) return true;
  return !data.results.some((result) => result.groups.some((group) => group.stats.status === "ok"));
}

export async function enqueueQuery(query: string): Promise<void> {
  const key = queueKey(query);
  if (!key) return;

  const ref = db().collection("search_queue").doc(key);
  const snapshot = await ref.get();
  const now = Timestamp.now();
  const cleaned = query
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

  if (!snapshot.exists) {
    await ref.set({ query: cleaned, status: "pending", hits: 1, createdAt: now, lastAt: now });
    return;
  }
  const processed = snapshot.get("processedAt") as Timestamp | undefined;
  const stale =
    snapshot.get("status") === "done" &&
    processed !== undefined &&
    now.toMillis() - processed.toMillis() > REQUEUE_AFTER_MS;
  await ref.update({ hits: FieldValue.increment(1), lastAt: now, ...(stale ? { status: "pending" } : {}) });
}
