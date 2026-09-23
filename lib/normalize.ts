import { CATEGORY_WORDS, STOP_TOKENS, TOKEN_ALIASES } from "./aliases";
import type { Product, Variant } from "./types";

const AZ_MAP: Record<string, string> = {
  ə: "e",
  ı: "i",
  ö: "o",
  ü: "u",
  ş: "s",
  ç: "c",
  ğ: "g",
};

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "c", ч: "c", ш: "s", щ: "s",
  ъ: "", ы: "i", ь: "", э: "e", ю: "u", я: "a",
};

const VARIANT_TOKENS: ReadonlySet<string> = new Set(["edt", "edp", "parfum", "elixir", "cologne"]);

export function foldText(input: string): string {
  const lowered = input.normalize("NFC").replace(/[İI]/g, "i").toLowerCase();
  let out = "";
  for (const ch of lowered) out += AZ_MAP[ch] ?? CYRILLIC_MAP[ch] ?? ch;
  return out.normalize("NFD").replace(/\p{M}/gu, "");
}

function tokenize(folded: string): string[] {
  return folded
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean);
}

export function tokensOf(text: string): string[] {
  return tokenize(foldText(text)).map((t) => TOKEN_ALIASES[t] ?? t);
}

export interface ParsedQuery {
  tokens: string[];
  volumeMl: number | null;
  variant: Variant | null;
  categories: string[];
}

export function parseQuery(raw: string): ParsedQuery {
  let folded = foldText(raw);

  let volumeMl: number | null = null;
  folded = folded.replace(/(?<![a-z0-9])(\d{1,4})\s*ml(?![a-z])/, (_, digits: string) => {
    volumeMl = Number(digits);
    return " ";
  });

  folded = folded
    .replace(/eau\s+de\s+parfum/g, " edp ")
    .replace(/eau\s+de\s+toilette/g, " edt ")
    .replace(/eau\s+de\s+cologne/g, " cologne ");

  let tokens = tokenize(folded)
    .map((t) => TOKEN_ALIASES[t] ?? t)
    .filter((t) => !STOP_TOKENS.has(t));

  let variant: Variant | null = null;
  const variantToken = tokens.find((t) => VARIANT_TOKENS.has(t));
  if (variantToken) {
    variant = variantToken as Variant;
    tokens = tokens.filter((t) => t !== variantToken);
  }

  const categories = new Set<string>();
  tokens = tokens.filter((t) => {
    const category = CATEGORY_WORDS[t];
    if (!category) return true;
    categories.add(category);
    return false;
  });

  if (variant === "parfum" && tokens.length === 0 && categories.size === 0) {
    variant = null;
    categories.add("perfume");
  }

  return { tokens, volumeMl, variant, categories: [...categories] };
}

export interface IndexedProduct extends Product {
  tokens: string[];
}

export function indexProducts(products: Product[]): IndexedProduct[] {
  return products.map((product) => {
    const source = [product.brand, product.model, product.displayName, ...product.aliases].join(" ");
    return { ...product, tokens: [...new Set(tokensOf(source))] };
  });
}

function tokenMatches(queryToken: string, productToken: string): boolean {
  if (queryToken === productToken) return true;
  if (queryToken.length < 3 || /^\d+$/.test(queryToken)) return false;
  return productToken.startsWith(queryToken);
}

export function matchProducts(products: IndexedProduct[], query: ParsedQuery): IndexedProduct[] {
  if (query.tokens.length === 0 && query.categories.length === 0) return [];
  return products.filter((product) => {
    if (query.volumeMl !== null && product.volumeMl !== query.volumeMl) return false;
    if (query.variant !== null && product.variant !== query.variant) return false;
    if (query.categories.length > 0 && !query.categories.includes(product.category)) return false;
    return query.tokens.every((token) => product.tokens.some((pt) => tokenMatches(token, pt)));
  });
}
