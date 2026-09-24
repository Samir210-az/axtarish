import { AUTHENTICITY_LABELS, SOURCE_LABELS, formatAzn, formatDay } from "@/lib/format";
import type { GroupStats, ProductResult, PublicOffer } from "@/lib/types";
import { MIN_SELLERS_FOR_STATS } from "@/lib/config";
import { compareTwo } from "@/lib/compare";
import { OfferList } from "./OfferList";
import { PriceStrip } from "./PriceStrip";

function sourceSummary(mix: GroupStats["sourceMix"]): string {
  return Object.entries(mix)
    .map(([type, count]) => `${SOURCE_LABELS[type as keyof typeof SOURCE_LABELS]}: ${count}`)
    .join(", ");
}

function storeName(offer: PublicOffer): string {
  return `${offer.seller ?? "Fərdi satıcı"}${offer.cashOnly ? " (nağd)" : ""}`;
}

function Comparison({ pair, updatedAt }: { pair: NonNullable<ReturnType<typeof compareTwo>>; updatedAt: string }) {
  return (
    <div className="thin compare">
      <p className="compare-title">2 mağazanın müqayisəsi</p>
      <ul className="compare-list">
        <li>
          <span className="compare-label">Ən ucuz</span>
          <strong>{formatAzn(pair.cheapest.priceAzn)}</strong>
          <span className="compare-store">{storeName(pair.cheapest)}</span>
        </li>
        <li>
          <span className="compare-label">Ən baha</span>
          <strong>{formatAzn(pair.priciest.priceAzn)}</strong>
          <span className="compare-store">{storeName(pair.priciest)}</span>
        </li>
      </ul>
      <p>
        {pair.diffAzn === 0 ? (
          "Qiymətlər eynidir."
        ) : (
          <>
            Fərq: <strong>{formatAzn(pair.diffAzn)}</strong> ({pair.diffPct} %)
          </>
        )}
      </p>
      {(pair.cheapest.cashOnly || pair.priciest.cashOnly) && (
        <p className="thin-meta">(nağd) işarəli qiymət yalnız nağd ödəniş üçün keçərlidir.</p>
      )}
      <p className="thin-meta">
        Median üçün ən azı {MIN_SELLERS_FOR_STATS} satıcı lazımdır. Son yenilənmə: {formatDay(updatedAt)}
      </p>
    </div>
  );
}

function Group({ group, sellerOffers }: { group: ProductResult["groups"][number]; sellerOffers: PublicOffer[] }) {
  const { authenticity, stats } = group;
  const pair = stats.status === "insufficient" ? compareTwo(sellerOffers) : null;
  return (
    <section className={`group tone-${authenticity}`} aria-label={AUTHENTICITY_LABELS[authenticity]}>
      <h3 className="group-title">{AUTHENTICITY_LABELS[authenticity]}</h3>

      {stats.status === "ok" ? (
        <>
          <PriceStrip
            min={stats.min}
            max={stats.max}
            median={stats.median}
            p25={stats.p25}
            p75={stats.p75}
            tone={authenticity}
          />
          <dl className="facts">
            <div>
              <dt>Median</dt>
              <dd className="fact-key">{formatAzn(stats.median)}</dd>
            </div>
            <div>
              <dt>Əsas hissə</dt>
              <dd>
                {formatAzn(stats.p25)} – {formatAzn(stats.p75)}
              </dd>
            </div>
            <div>
              <dt>Satıcı sayı</dt>
              <dd>{stats.sellerCount}</dd>
            </div>
            <div>
              <dt>Mənbə</dt>
              <dd>{sourceSummary(stats.sourceMix)}</dd>
            </div>
            <div>
              <dt>Son yenilənmə</dt>
              <dd>{formatDay(stats.updatedAt)}</dd>
            </div>
          </dl>
        </>
      ) : pair ? (
        <Comparison pair={pair} updatedAt={stats.updatedAt} />
      ) : (
        <div className="thin">
          <p>
            Kifayət qədər məlumat yoxdur: bu qrup üzrə {stats.sellerCount} satıcı tapıldı, median üçün ən azı{" "}
            {MIN_SELLERS_FOR_STATS} lazımdır.
          </p>
          <p>
            Tapılan qiymətlər: <strong>{stats.prices.map(formatAzn).join(", ")}</strong>
          </p>
          <p className="thin-meta">Son yenilənmə: {formatDay(stats.updatedAt)}</p>
        </div>
      )}
    </section>
  );
}

export function ProductSection({ product }: { product: ProductResult }) {
  return (
    <article className="product">
      <h2 className="product-name">{product.name}</h2>
      <div className="product-body">
        {product.groups.map((group) => (
          <Group
            key={group.authenticity}
            group={group}
            sellerOffers={product.sellerOffers.filter((o) => o.authenticity === group.authenticity)}
          />
        ))}
        <OfferList offers={product.offers} truncated={product.offersTruncated} />
      </div>
    </article>
  );
}
