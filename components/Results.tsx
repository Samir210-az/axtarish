import Link from "next/link";
import { ALLOWED_WINDOWS } from "@/lib/config";
import { runSearch, validateSearchInput } from "@/lib/service";
import { ProductSection } from "./ProductSection";

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

export async function Results({ q, days }: { q: string; days: string | undefined }) {
  const input = validateSearchInput(q, days);
  if (!input.ok) return <Notice title={input.message} alert />;

  const outcome = await runSearch(input.q, input.days);
  if (!outcome.ok) return <Notice title={outcome.message} alert />;

  const { data } = outcome;

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
          <Link href={`/?${new URLSearchParams({ q: input.q, days: String(next) })}`}>
            Son {next} günə baxın
          </Link>
        )}
      </Notice>
    );
  }

  return (
    <div aria-live="polite">
      <p className="summary">
        Son {data.windowDays} gün üzrə {data.results.length} məhsul
      </p>
      {data.results.map((product) => (
        <ProductSection key={product.productId} product={product} />
      ))}
    </div>
  );
}
