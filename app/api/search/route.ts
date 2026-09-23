import { after, NextResponse } from "next/server";
import { enqueueQuery, needsMoreData } from "@/lib/searchQueue";
import { runSearch, validateSearchInput } from "@/lib/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const input = validateSearchInput(params.get("q") ?? "", params.get("days") ?? undefined);
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  const outcome = await runSearch(input.q, input.days);
  if (!outcome.ok) return NextResponse.json({ error: outcome.message }, { status: outcome.status });

  if (needsMoreData(outcome.data)) after(() => enqueueQuery(input.q).catch(() => undefined));

  return NextResponse.json(outcome.data, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
  });
}
