import Link from "next/link";
import { SORT_KEYS, type SortKey } from "@/lib/config";

const LABELS: Record<SortKey, string> = {
  sellers: "Ən çox mağaza",
  price_asc: "Ucuzdan bahaya",
  price_desc: "Bahadan ucuza",
  discount: "Ən böyük endirim",
};

export function SortBar({ current, hrefFor }: { current: SortKey; hrefFor: (sort: SortKey) => string }) {
  return (
    <nav className="sortbar" aria-label="Sıralama">
      <span className="sortbar-label">Sırala:</span>
      {SORT_KEYS.map((key) => (
        <Link key={key} href={hrefFor(key)} aria-current={key === current ? "true" : undefined}>
          {LABELS[key]}
        </Link>
      ))}
    </nav>
  );
}
