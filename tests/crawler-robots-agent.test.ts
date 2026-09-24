import { describe, expect, it } from "vitest";
import { USER_AGENT } from "../crawler/http";
import { isAllowed, parseRobots } from "../crawler/robots";

describe("parseRobots: botun adı", () => {
  it("brauzer formatlı User-Agent-də real bot adını (AxtarishBot) tanıyır", () => {
    const rules = parseRobots("User-agent: AxtarishBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n", USER_AGENT);
    expect(isAllowed(rules, "/elan/1")).toBe(false);
  });

  it("adı çəkilməyən botlar üçün * qrupunu tətbiq edir", () => {
    const rules = parseRobots("User-agent: dotbot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\n", USER_AGENT);
    expect(isAllowed(rules, "/elan/1")).toBe(true);
    expect(isAllowed(rules, "/private/x")).toBe(false);
  });

  it("sadə User-Agent formatında da işləyir", () => {
    const rules = parseRobots("User-agent: axtarishbot\nDisallow: /a\n", "AxtarishBot/0.1 (+https://x.az)");
    expect(isAllowed(rules, "/a/1")).toBe(false);
  });

  it("Tap.az-ın real robots.txt qaydaları: new olan ünvanlar və giriş bölmələri qadağandır, elanlar yox", () => {
    const text = [
      "User-Agent: *",
      "Disallow: /authentications",
      "Disallow: /auth/",
      "Disallow: /pages/rules",
      "Disallow: /pages/advertising",
      "Disallow: /bookmarks",
      "Disallow: /*new",
      "",
      "User-agent: meta-externalagent",
      "Disallow: /",
      "",
      "User-agent: dotbot",
      "Crawl-delay: 10",
    ].join("\n");
    const rules = parseRobots(text, USER_AGENT);
    expect(isAllowed(rules, "/items/123456")).toBe(true);
    expect(isAllowed(rules, "/elanlar?keywords=iphone")).toBe(true);
    expect(isAllowed(rules, "/items/iphone-15-new-789")).toBe(false);
    expect(isAllowed(rules, "/bookmarks")).toBe(false);
    expect(isAllowed(rules, "/pages/rules")).toBe(false);
    expect(isAllowed(rules, "/auth/login")).toBe(false);
    expect(rules.crawlDelaySec).toBeNull();
  });
});
