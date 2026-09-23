import { isAllowed, parseRobots, parseSitemaps, type RobotsRules } from "./robots";

export const USER_AGENT = "Mozilla/5.0 (compatible; AxtarishBot/0.1; +https://axtarish-az.vercel.app; price research)";

const MIN_DELAY_MS = 2500;
const MAX_BODY_CHARS = 3_000_000;
const CHALLENGE = /just a moment|cf-chl|attention required|enable javascript and cookies/i;

export type FetchFailure = "robots" | "blocked" | "host_closed" | "http" | "network";

export type FetchOutcome =
  { ok: true; url: string; status: number; body: string } | { ok: false; reason: FetchFailure; detail: string };

interface HostState {
  rules: RobotsRules;
  sitemaps: string[];
  nextAllowedAt: number;
  state: "open" | "blocked" | "closed";
  detail: string;
}

export interface FetcherDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  userAgent?: string;
}

export function isBlockResponse(status: number, body: string): boolean {
  if (status === 403 || status === 429) return true;
  return status === 503 && CHALLENGE.test(body.slice(0, 6000));
}

export class PoliteFetcher {
  private readonly hosts = new Map<string, HostState>();
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly userAgent: string;

  constructor(deps: FetcherDeps = {}) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.now = deps.now ?? Date.now;
    this.userAgent = deps.userAgent ?? USER_AGENT;
  }

  private delayFor(state: HostState): number {
    return Math.max(MIN_DELAY_MS, (state.rules.crawlDelaySec ?? 0) * 1000);
  }

  private async request(url: string): Promise<{ status: number; body: string; finalUrl: string }> {
    const response = await this.fetchImpl(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "text/html,application/xml;q=0.9,*/*;q=0.5",
        "Accept-Language": "az,en;q=0.7",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, MAX_BODY_CHARS), finalUrl: response.url || url };
  }

  private async loadHost(origin: string): Promise<HostState> {
    const cached = this.hosts.get(origin);
    if (cached) return cached;

    const state: HostState = {
      rules: { allow: [], disallow: [], crawlDelaySec: null },
      sitemaps: [],
      nextAllowedAt: 0,
      state: "open",
      detail: "",
    };
    this.hosts.set(origin, state);

    try {
      const { status, body } = await this.request(`${origin}/robots.txt`);
      const looksLikeRobots = /user-agent|disallow|sitemap/i.test(body) && !/<html/i.test(body.slice(0, 300));
      if (isBlockResponse(status, body)) {
        state.state = "blocked";
        state.detail = `robots.txt HTTP ${status}`;
      } else if (status >= 500) {
        state.state = "closed";
        state.detail = `robots.txt HTTP ${status}`;
      } else if (status < 400 && looksLikeRobots) {
        state.rules = parseRobots(body, this.userAgent);
        state.sitemaps = parseSitemaps(body);
      }
    } catch (error) {
      state.state = "closed";
      state.detail = `robots.txt: ${error instanceof Error ? error.message : "xəta"}`;
    }
    state.nextAllowedAt = this.now() + this.delayFor(state);
    return state;
  }

  async sitemapsFor(origin: string): Promise<string[]> {
    return (await this.loadHost(origin)).sitemaps;
  }

  async get(rawUrl: string): Promise<FetchOutcome> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { ok: false, reason: "http", detail: "yanlış ünvan" };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false, reason: "http", detail: "yalnız http/https" };
    }

    const state = await this.loadHost(url.origin);
    if (state.state === "blocked") return { ok: false, reason: "blocked", detail: state.detail };
    if (state.state === "closed") return { ok: false, reason: "host_closed", detail: state.detail };
    if (!isAllowed(state.rules, url.pathname + url.search)) {
      return { ok: false, reason: "robots", detail: "robots.txt qadağan edir" };
    }

    const wait = state.nextAllowedAt - this.now();
    if (wait > 0) await this.sleep(wait);

    try {
      const { status, body, finalUrl } = await this.request(url.toString());
      state.nextAllowedAt = this.now() + this.delayFor(state);
      if (isBlockResponse(status, body)) {
        state.state = "blocked";
        state.detail = `HTTP ${status}`;
        return { ok: false, reason: "blocked", detail: state.detail };
      }
      if (status >= 400) return { ok: false, reason: "http", detail: `HTTP ${status}` };
      return { ok: true, url: finalUrl, status, body };
    } catch (error) {
      state.nextAllowedAt = this.now() + this.delayFor(state);
      return { ok: false, reason: "network", detail: error instanceof Error ? error.message : "xəta" };
    }
  }
}
