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
  const sortParam = first(params.sort);
  const showParam = first(params.show);
  const parsedDays = daysParam === undefined ? SEARCH_WINDOW_DAYS : Number(daysParam);
  const formDays = isAllowedWindow(parsedDays) ? parsedDays : SEARCH_WINDOW_DAYS;

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <Link href="/" className="wordmark">
            <span className="mark" aria-hidden="true" />
            Axtarış
          </Link>
        </div>
      </header>

      <div className="page">
        <main>
          <section className="ask">
            <h1>Bu məhsulu Azərbaycanda kim neçə manata satır?</h1>
            <div className="divider" aria-hidden="true">
              <span />
            </div>
            <p className="lede">Məhsulun adını yazın. Bazada olan qiymətləri, medianı və satıcı sayını göstəririk.</p>
            <SearchForm key={`${q}|${formDays}`} initialQuery={q} initialDays={formDays} />
            <div className="examples">
              <span>Nümunələr:</span>
              {EXAMPLES.map((example) => (
                <Link key={example} href={`/?${new URLSearchParams({ q: example, days: String(formDays) })}`}>
                  {example}
                </Link>
              ))}
            </div>
          </section>

          {q ? (
            <Suspense
              key={`${q}|${daysParam ?? ""}|${sortParam ?? ""}|${showParam ?? ""}`}
              fallback={
                <p className="loading" role="status">
                  Axtarılır…
                </p>
              }
            >
              <Results q={q} days={daysParam} sort={sortParam} show={showParam} />
            </Suspense>
          ) : (
            <StripLegend />
          )}
        </main>

        <p className="ai-disclosure">Axtarış nəticələri süni intellektin köməyi ilə sıralanır.</p>

        <footer className="footer">
          <a href="https://instagram.com/securtiy_group" target="_blank" rel="noopener noreferrer">
            By securtiy_group
          </a>
        </footer>
      </div>
    </>
  );
}
