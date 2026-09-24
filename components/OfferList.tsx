"use client";

import { useState } from "react";
import { AUTHENTICITY_LABELS, SOURCE_LABELS, formatAzn, formatDay } from "@/lib/format";
import type { PublicOffer } from "@/lib/types";

type SortKey = "price" | "date" | "discount";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "price", label: "Qiymətə görə" },
  { key: "date", label: "Tarixə görə" },
  { key: "discount", label: "Endirimə görə" },
];

function sortOffers(offers: PublicOffer[], key: SortKey): PublicOffer[] {
  const list = [...offers];
  if (key === "price") return list.sort((a, b) => a.priceAzn - b.priceAzn);
  if (key === "date") return list.sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt));
  return list.sort((a, b) => (b.discountPct ?? 0) - (a.discountPct ?? 0) || a.priceAzn - b.priceAzn);
}

function Seller({ offer }: { offer: PublicOffer }) {
  if (offer.sellerType === "individual") return <span>Fərdi satıcı</span>;
  const name = offer.seller ?? "Mağaza";
  if (!offer.sellerUrl) return <span>{name}</span>;
  return (
    <a href={offer.sellerUrl} target="_blank" rel="noopener noreferrer nofollow">
      {name}
    </a>
  );
}

export function OfferList({ offers, truncated }: { offers: PublicOffer[]; truncated: boolean }) {
  const [sort, setSort] = useState<SortKey>("price");
  const sorted = sortOffers(offers, sort);

  return (
    <details className="offers">
      <summary>Bütün qiymətlər ({offers.length})</summary>

      <div className="offers-sort" role="group" aria-label="Sıralama">
        {SORTS.map((option) => (
          <button key={option.key} type="button" aria-pressed={sort === option.key} onClick={() => setSort(option.key)}>
            {option.label}
          </button>
        ))}
      </div>

      <ol className="offers-list">
        {sorted.map((offer, index) => (
          <li key={`${offer.effectiveAt}-${index}`}>
            <span className="offer-seller">
              <Seller offer={offer} />
              <small>
                {SOURCE_LABELS[offer.sourceType]}, {AUTHENTICITY_LABELS[offer.authenticity].toLowerCase()}
              </small>
              {offer.cashOnly && <em className="tag-cash">nağd ödəniş üçün</em>}
            </span>
            <span className="offer-price">
              <strong>{formatAzn(offer.priceAzn)}</strong>
              {offer.discountPct !== null && offer.oldPriceAzn !== null && (
                <small>
                  <s>{formatAzn(offer.oldPriceAzn)}</s> −{offer.discountPct}%
                </small>
              )}
            </span>
            <time className="offer-date" dateTime={offer.effectiveAt}>
              {formatDay(offer.effectiveAt)}
            </time>
          </li>
        ))}
      </ol>

      {truncated && <p className="offers-note">Ən ucuz {offers.length} qiymət göstərilir.</p>}
    </details>
  );
}
