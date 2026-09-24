const DROP = new Set(["dursou"]);
const MAP: Record<string, string> = { serabi: "serab" };

export function canonicalNameToken(token: string): string | null {
  if (DROP.has(token)) return null;
  const mapped = MAP[token];
  if (mapped) return mapped;
  if (token.length >= 5 && /^[a-z]+$/.test(token)) return token.replace(/sh/g, "s");
  return token;
}
