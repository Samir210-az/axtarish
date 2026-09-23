import { AUTHENTICITY_LABELS, SOURCE_LABELS, formatAzn, formatDay } from "@/lib/format";
import type { GroupStats, ProductResult } from "@/lib/types";
import { MIN_SELLERS_FOR_STATS } from "@/lib/config";
import { OfferList } from "./OfferList";
import { PriceStrip } from "./PriceStrip";

function sourceSummary(mix: GroupStats["sourceMix"]): string {
  return Object.entries(mix)
    .map(([type, count]) => `${SOURCE_LABELS[type as keyof typeof SOURCE_LABELS]}: ${count}`)
    .join(", ");
}

function Group({ group }: { group: ProductResult["groups"][number] }) {
  const { authenticity, stats } = group;
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
          <Group key={group.authenticity} group={group} />
        ))}
        <OfferList offers={product.offers} truncated={product.offersTruncated} />
      </div>
    </article>
  );
}
