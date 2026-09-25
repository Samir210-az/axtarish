import { afterEach, describe, expect, it, vi } from "vitest";
import { cosineSimilarity, embedText, normalizeVector } from "@/lib/embeddings";

describe("normalizeVector", () => {
  it("vektoru vahid uzunluğa gətirir", () => {
    const normalized = normalizeVector([3, 4]);
    expect(normalized[0]).toBeCloseTo(0.6);
    expect(normalized[1]).toBeCloseTo(0.8);
  });

  it("sıfır vektoru olduğu kimi qaytarır (bölmə xətası olmasın)", () => {
    expect(normalizeVector([0, 0])).toEqual([0, 0]);
  });
});

describe("cosineSimilarity", () => {
  it("eyni vektorlar üçün 1 qaytarır", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
  });

  it("perpendikulyar vektorlar üçün 0 qaytarır", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("fərqli uzunluqda vektorlarda 0 qaytarır (partlamır)", () => {
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
  });

  it("boş vektorlarda 0 qaytarır", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("embedText", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("GEMINI_API_KEY yoxdursa şəbəkəyə toxunmadan null qaytarır", async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await embedText("dior sauvage", "RETRIEVAL_QUERY")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("boş mətn üçün null qaytarır", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    expect(await embedText("   ", "RETRIEVAL_QUERY")).toBeNull();
  });

  it("uğurlu cavabı normallaşdırılmış vektor kimi qaytarır", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ embedding: { values: [3, 4] } }),
      })),
    );
    const vector = await embedText("dior sauvage", "RETRIEVAL_QUERY");
    expect(vector).not.toBeNull();
    expect(vector?.[0]).toBeCloseTo(0.6);
  });

  it("API 4xx/5xx qaytardıqda exception atmadan null qaytarır", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })),
    );
    await expect(embedText("dior sauvage", "RETRIEVAL_QUERY")).resolves.toBeNull();
  });

  it("şəbəkə xətasında exception atmadan null qaytarır", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    await expect(embedText("dior sauvage", "RETRIEVAL_QUERY")).resolves.toBeNull();
  });

  it("cavabda embedding sahəsi olmadıqda null qaytarır", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    );
    expect(await embedText("dior sauvage", "RETRIEVAL_QUERY")).toBeNull();
  });
});
