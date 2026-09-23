import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export class ConfigError extends Error {}

const REQUIRED_FIELDS = ["project_id", "client_email", "private_key"] as const;

export function parseServiceAccount(raw: string): Record<string, unknown> {
  const value = raw.trim();
  const text = value.startsWith("{") ? value : Buffer.from(value, "base64").toString("utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ConfigError("Service account oxunmadı: JSON mətni və ya base64 JSON olmalıdır");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ConfigError("Service account JSON obyekt olmalıdır");
  }

  const account = parsed as Record<string, unknown>;
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = account[field];
    return typeof value !== "string" || value === "";
  });
  if (missing.length > 0) {
    throw new ConfigError(`Service account-da sahə çatışmır: ${missing.join(", ")}`);
  }
  return account;
}

function readServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!raw) throw new ConfigError("FIREBASE_SERVICE_ACCOUNT təyin edilməyib");
  return parseServiceAccount(raw);
}

export function db(): Firestore {
  if (getApps().length === 0) {
    const account = readServiceAccount();
    try {
      initializeApp({ credential: cert(account) });
    } catch {
      throw new ConfigError(
        "Service account açarı etibarsızdır: private_key tam yapışdırılmayıb ola bilər",
      );
    }
  }
  return getFirestore();
}
