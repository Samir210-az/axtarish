import type { Authenticity, SourceType, Variant } from "./types";

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr",
];

const bakuDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  timeZone: "Asia/Baku",
});

export function formatAzn(value: number): string {
  const [whole = "0", fraction = "00"] = value.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const decimals = fraction === "00" ? "" : `,${fraction}`;
  return `${grouped}${decimals}\u00a0₼`;
}

export function formatDay(iso: string): string {
  const parts = bakuDate.formatToParts(new Date(iso));
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  return `${day} ${MONTHS[month - 1] ?? ""}`.trim();
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  online_store: "Onlayn mağaza",
  marketplace: "Marketplace",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export const AUTHENTICITY_LABELS: Record<Authenticity, string> = {
  original: "Orijinal",
  replica: "Replika",
  unknown: "Təsnif olunmayıb",
};

export const VARIANT_LABELS: Record<Variant, string> = {
  edt: "Eau de Toilette",
  edp: "Eau de Parfum",
  parfum: "Parfum",
  elixir: "Elixir",
  cologne: "Cologne",
};
