export interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelaySec: number | null;
}

interface Group {
  agents: string[];
  allow: string[];
  disallow: string[];
  delay: number | null;
}

export function parseRobots(text: string, agent: string): RobotsRules {
  const token = agent.split("/")[0]!.toLowerCase();
  const groups: Group[] = [];
  let current: Group | null = null;
  let previousWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (!line || colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === "user-agent") {
      if (!current || !previousWasAgent) {
        current = { agents: [], allow: [], disallow: [], delay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      previousWasAgent = true;
      continue;
    }
    previousWasAgent = false;
    if (!current) continue;

    if (key === "allow" && value) current.allow.push(value);
    else if (key === "disallow" && value) current.disallow.push(value);
    else if (key === "crawl-delay" && Number.isFinite(Number(value))) current.delay = Number(value);
  }

  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const applicable = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes("*"));

  return {
    allow: applicable.flatMap((g) => g.allow),
    disallow: applicable.flatMap((g) => g.disallow),
    crawlDelaySec: applicable.reduce<number | null>(
      (max, g) => (g.delay !== null && (max === null || g.delay > max) ? g.delay : max),
      null,
    ),
  };
}

function toRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

function longestMatch(patterns: string[], path: string): number {
  let best = -1;
  for (const pattern of patterns) {
    if (toRegex(pattern).test(path) && pattern.length > best) best = pattern.length;
  }
  return best;
}

export function isAllowed(rules: RobotsRules, pathWithQuery: string): boolean {
  const disallowed = longestMatch(rules.disallow, pathWithQuery);
  if (disallowed === -1) return true;
  return longestMatch(rules.allow, pathWithQuery) >= disallowed;
}
