import { describe, expect, it } from "vitest";
import { PoliteFetcher } from "../crawler/http";

function flaky(failures: Record<string, number>, routes: Record<string, string>) {
  const calls: string[] = [];
  const sleeps: number[] = [];
  let clock = 1_000_000;
  const remaining = { ...failures };
  const fetcher = new PoliteFetcher({
    fetchImpl: (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if ((remaining[url] ?? 0) > 0) {
        remaining[url] = (remaining[url] ?? 0) - 1;
        throw new TypeError("fetch failed");
      }
      const body = routes[url];
      return body === undefined ? new Response("yox", { status: 404 }) : new Response(body, { status: 200 });
    }) as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
  });
  return { fetcher, calls, sleeps };
}

describe("PoliteFetcher keçici xətalarda təkrar cəhd", () => {
  it("robots.txt iki dəfə şəbəkə xətası versə də üçüncü cəhddə oxuyur və sayt açıq qalır", async () => {
    const { fetcher, calls, sleeps } = flaky(
      { "https://a.az/robots.txt": 2 },
      { "https://a.az/robots.txt": "User-agent: *\nDisallow: /private\n", "https://a.az/p/1": "salam" },
    );
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: true, body: "salam" });
    expect(calls.filter((c) => c.endsWith("/robots.txt"))).toHaveLength(3);
    expect(sleeps.slice(0, 2)).toEqual([3000, 6000]);
  });

  it("robots.txt üç cəhddə də uğursuzdursa sayt bağlı sayılır", async () => {
    const { fetcher, calls } = flaky({ "https://a.az/robots.txt": 5 }, { "https://a.az/p/1": "salam" });
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: false, reason: "host_closed" });
    expect(calls).toHaveLength(3);
  });

  it("səhifə sorğusu bir dəfə təkrar cəhd edir", async () => {
    const { fetcher, calls } = flaky(
      { "https://a.az/p/1": 1 },
      { "https://a.az/robots.txt": "User-agent: *\n", "https://a.az/p/1": "salam" },
    );
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: true, body: "salam" });
    expect(calls.filter((c) => c.endsWith("/p/1"))).toHaveLength(2);
  });

  it("səhifə iki cəhddə də uğursuzdursa 'network' qaytarır, sayt bağlanmır", async () => {
    const { fetcher } = flaky(
      { "https://a.az/p/1": 2 },
      { "https://a.az/robots.txt": "User-agent: *\n", "https://a.az/p/1": "salam", "https://a.az/p/2": "ikinci" },
    );
    expect(await fetcher.get("https://a.az/p/1")).toMatchObject({ ok: false, reason: "network" });
    expect(await fetcher.get("https://a.az/p/2")).toMatchObject({ ok: true, body: "ikinci" });
  });
});
