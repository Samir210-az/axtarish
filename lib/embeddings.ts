const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const REQUEST_TIMEOUT_MS = 8_000;
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function magnitude(vector: number[]): number {
  let sum = 0;
  for (const value of vector) sum += value * value;
  return Math.sqrt(sum);
}

/** gemini-embedding-001 yalnız tam (3072) ölçüdə avtomatik normallaşdırılır;
 * kəsilmiş (truncated) ölçülərdə normallaşdırma özümüzə qalır. */
export function normalizeVector(vector: number[]): number[] {
  const mag = magnitude(vector);
  if (mag === 0) return vector;
  return vector.map((value) => value / mag);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  const denom = magnitude(a) * magnitude(b);
  return denom === 0 ? 0 : dot / denom;
}

interface EmbedContentResponse {
  embedding?: { values?: number[] };
}

/**
 * Gemini embedContent API-sini çağırır. GEMINI_API_KEY yoxdursa, şəbəkə xətası
 * baş verərsə və ya cavab gözlənilən formatda deyilsə, heç vaxt exception atmır —
 * null qaytarır ki, axtarış bu halda mövcud açar-sözlə uyğunlaşdırmaya keçsin.
 */
export async function embedText(text: string, taskType: EmbeddingTaskType): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || text.trim().length === 0) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });
    if (!res.ok) {
      console.warn(`embedText: Gemini API ${res.status} qaytardı`);
      return null;
    }
    const data = (await res.json()) as EmbedContentResponse;
    const values = data.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    return normalizeVector(values);
  } catch (error) {
    console.warn("embedText: sorğu uğursuz oldu:", error instanceof Error ? error.message : "naməlum xəta");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
