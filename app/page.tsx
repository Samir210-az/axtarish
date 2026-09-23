import Link from "next/link";
import { Suspense } from "react";
import { Results } from "@/components/Results";
import { SearchForm } from "@/components/SearchForm";
import { StripLegend } from "@/components/StripLegend";
import { SEARCH_WINDOW_DAYS, isAllowedWindow } from "@/lib/config";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const EXAMPLES = ["Dior Sauvage 100 ml", "Parfüm", "iPhone 15"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (first(params.q) ?? "").trim();
  const daysParam = first(params.days);
  const parsedDays = daysParam === undefined ? SEARCH_WINDOW_DAYS : Number(daysParam);
  const formDays = isAllowedWindow(parsedDays) ? parsedDays : SEARCH_WINDOW_DAYS;

  return (
    <div className="page">
      <header className="masthead">
        <Link href="/" className="wordmark">
          Axtarış
        </Link>
      </header>

      <main>
        <section className="ask">
          <h1>Bu məhsulu Azərbaycanda kim neçə manata satır?</h1>
          <SearchForm key={`${q}|${formDays}`} initialQuery={q} initialDays={formDays} />
          <p className="examples">
            Nümunələr:{" "}
            {EXAMPLES.map((example, index) => (
              <span key={example}>
                {index > 0 && ", "}
                <Link href={`/?${new URLSearchParams({ q: example, days: String(formDays) })}`}>{example}</Link>
              </span>
            ))}
          </p>
        </section>

        {q ? (
          <Suspense key={`${q}|${daysParam ?? ""}`} fallback={<p className="loading" role="status">Axtarılır…</p>}>
            <Results q={q} days={daysParam} />
          </Suspense>
        ) : (
          <StripLegend />
        )}
      </main>

      <footer className="footer">
        <a href="https://instagram.com/securtiy_group" target="_blank" rel="noopener noreferrer">
          By securtiy_group
        </a>
      </footer>
    </div>
  );
}
