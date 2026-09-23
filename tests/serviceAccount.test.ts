import { describe, expect, it } from "vitest";
import { ConfigError, parseServiceAccount } from "@/lib/firebaseAdmin";

const account = {
  type: "service_account",
  project_id: "axtaris-b9ae7",
  client_email: "firebase-adminsdk@axtaris-b9ae7.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nSECRET-BODY\n-----END PRIVATE KEY-----\n",
};
const json = JSON.stringify(account, null, 2);

describe("parseServiceAccount", () => {
  it("birbaşa yapışdırılmış JSON mətnini oxuyur", () => {
    expect(parseServiceAccount(json)).toEqual(account);
  });

  it("JSON ətrafındakı boşluq və sətir keçidlərini atır", () => {
    expect(parseServiceAccount(`\n  ${json}\n\n`)).toEqual(account);
  });

  it("base64 formatını oxuyur", () => {
    expect(parseServiceAccount(Buffer.from(json).toString("base64"))).toEqual(account);
  });

  it("private_key-dəki \\n ardıcıllığını real sətir keçidinə çevirir", () => {
    const raw = '{"project_id":"p","client_email":"e","private_key":"a\\nb"}';
    expect(parseServiceAccount(raw).private_key).toBe("a\nb");
  });

  it("yanlış mətndə ConfigError atır", () => {
    expect(() => parseServiceAccount("bu json deyil")).toThrow(ConfigError);
    expect(() => parseServiceAccount("{ pozuq json")).toThrow(ConfigError);
    expect(() => parseServiceAccount("[1,2]")).toThrow(ConfigError);
  });

  it("çatışan sahələri adı ilə bildirir", () => {
    const partial = JSON.stringify({ project_id: "p" });
    expect(() => parseServiceAccount(partial)).toThrow("client_email, private_key");
  });

  it("xəta mesajına açarın məzmununu yazmır", () => {
    const broken = json.replace('"project_id": "axtaris-b9ae7",', "");
    try {
      parseServiceAccount(broken);
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("SECRET-BODY");
    }
  });
});
