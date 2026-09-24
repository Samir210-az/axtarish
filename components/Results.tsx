import Link from "next/link";
import { after } from "next/server";
import { ALLOWED_WINDOWS, DEFAULT_SORT, MAX_RESULT_PRODUCTS, MAX_SHOW, type SortKey } from "@/lib/config";
import { enqueueQuery, needsMoreData } from "@/lib/searchQueue";
import { parseListOptions, runSearch, validateSearchInput } from "@/lib/service";
import { ProductSection } from "./ProductSection";
import { SortBar } from "./SortBar";

function widerWindow(days: number): number | null {
  return ALLOWED_WINDOWS.find((value) => value > days) ?? null;
}

function Notice({ title, children, alert = false }: { title: string; children?: React.ReactNode; alert?: boolean }) {
  return (
    <div className="notice" role={alert ? "alert" : "status"}>
      <p className="notice-title">{title}</p>
      {children && <div className="notice-body">{children}</div>}
    </div>
  );
}

export async function Results({
  q,
  days,
  sort,
  show,
}: {
  q: string;
  days: string | undefined;
  sort?: string;
  show?: string;
}) {
  const input = validateSearchInput(q, days);
  if (!input.ok) return <Notice title={input.message} alert />;

  const options = parseListOptions(sort, show);
  const outcome = await runSearch(input.q, input.days, options);
  if (!outcome.ok) return <Notice title={outcome.message} alert />;

  const { data } = outcome;
  if (needsMoreData(data)) after(() => enqueueQuery(input.q).catch(() => undefined));

  if (!data.understood) {
    return (
      <Notice title="Sorğuda məhsul adı və ya kateqoriya yoxdur.">
        Məsələn: Dior Sauvage 100 ml, iPhone 15 və ya Parfüm.
      </Notice>
    );
  }

  if (data.matchedProducts === 0) {
    return <Notice title={`Bazada “${input.q}” üzrə məhsul yoxdur.`}>Yazılışı dəyişib yenidən yoxlayın.</Notice>;
  }

  if (data.results.length === 0) {
    const next = widerWindow(data.windowDays);
    return (
      <Notice title={`Bu məhsul bazada var, amma son ${data.windowDays} gündə qiymət tapılmayıb.`}>
        {next && (
          <Link href={`/?${new URLSearchParams({ q: input.q, days: String(next) })}`}>Son {next} günə baxın</Link>
        )}
      </Notice>
    );
  }

  const { pricedProducts, matchedProducts, examinedProducts, results } = data;
  const hrefFor = (nextSort: SortKey, nextLimit: number): string => {
    const params = new URLSearchParams({ q: input.q, days: String(data.windowDays) });
    if (nextSort !== DEFAULT_SORT) params.set("sort", nextSort);
    if (nextLimit > MAX_RESULT_PRODUCTS) params.set("show", String(nextLimit));
    return `/?${params}`;
  };

  let note: string | null = null;
  if (matchedProducts > examinedProducts) {
    note = `Bazada bu sorğuya ${matchedProducts} məhsul uyğun gəlir, ən uyğun ${examinedProducts}-i yoxlanıldı. Nəticəni daraltmaq üçün adı dəqiqləşdirin.`;
  } else if (matchedProducts > pricedProducts) {
    note = `Bazada bu sorğuya ${matchedProducts} məhsul uyğun gəlir, ${matchedProducts - pricedProducts}-nin son ${data.windowDays} gündə qiyməti yoxdur.`;
  }
  const hasMore = results.length < pricedProducts;

  return (
    <div aria-live="polite">
      <p className="summary">
        Son {data.windowDays} gün üzrə {pricedProducts} məhsulun qiyməti var
      </p>
      {note && <p className="summary-note">{note}</p>}
      <SortBar current={data.sort} hrefFor={(key) => hrefFor(key, options.limit)} />
      {results.map((product) => (
        <ProductSection key={product.productId} product={product} />
      ))}
      {hasMore && options.limit < MAX_SHOW && (
        <Link className="more" href={hrefFor(data.sort, Math.min(options.limit + MAX_RESULT_PRODUCTS, MAX_SHOW))}>
          Daha çox göstər ({results.length} / {pricedProducts})
        </Link>
      )}
      {hasMore && options.limit >= MAX_SHOW && (
        <p className="summary-note">Ən çox {MAX_SHOW} məhsul göstərilir. Daha az nəticə üçün adı dəqiqləşdirin.</p>
      )}
    </div>
  );
}
