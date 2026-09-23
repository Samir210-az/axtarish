import { describe, expect, it } from "vitest";
import { isAllowed, parseRobots } from "../crawler/robots";

const UA = "AxtarishBot/0.1 (+https://example.az)";

describe("robots.txt", () => {
  it("* qrupunu tətbiq edir və ən uzun qaydanı seçir", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/public\n", UA);
    expect(isAllowed(rules, "/private/data")).toBe(false);
    expect(isAllowed(rules, "/private/public/page")).toBe(true);
    expect(isAllowed(rules, "/products")).toBe(true);
  });

  it("botun öz adı olan qrup * qrupundan üstündür", () => {
    const text = "User-agent: *\nDisallow: /\n\nUser-agent: AxtarishBot\nDisallow: /admin\n";
    const rules = parseRobots(text, UA);
    expect(isAllowed(rules, "/products")).toBe(true);
    expect(isAllowed(rules, "/admin/x")).toBe(false);
  });

  it("boş Disallow hər şeyə icazə verir", () => {
    expect(isAllowed(parseRobots("User-agent: *\nDisallow:\n", UA), "/anything")).toBe(true);
  });

  it("bütün saytı bağlayan qaydanı tanıyır", () => {
    expect(isAllowed(parseRobots("User-agent: *\nDisallow: /\n", UA), "/elanlar?keywords=a")).toBe(false);
  });

  it("wildcard və $ işarəsini dəstəkləyir", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /*?sort=\nDisallow: /*.pdf$\n", UA);
    expect(isAllowed(rules, "/list?sort=price")).toBe(false);
    expect(isAllowed(rules, "/files/a.pdf")).toBe(false);
    expect(isAllowed(rules, "/files/a.pdf.html")).toBe(true);
  });

  it("qrup bir neçə User-agent sətrindən ibarət ola bilər və Crawl-delay oxunur", () => {
    const rules = parseRobots("User-agent: foo\nUser-agent: axtarishbot\nCrawl-delay: 7\nDisallow: /x\n", UA);
    expect(rules.crawlDelaySec).toBe(7);
    expect(isAllowed(rules, "/x/1")).toBe(false);
  });

  it("şərhləri və qeyri-sətirləri nəzərə almır", () => {
    const rules = parseRobots("# salam\nUser-agent: * # hamı\nDisallow: /a # gizli\nbozuq sətir\n", UA);
    expect(isAllowed(rules, "/a/b")).toBe(false);
  });
});
