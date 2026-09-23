import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export class ConfigError extends Error {}

function readServiceAccount(): Record<string, unknown> {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) throw new ConfigError("FIREBASE_SERVICE_ACCOUNT_BASE64 təyin edilməyib");
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new ConfigError("FIREBASE_SERVICE_ACCOUNT_BASE64 oxunmadı: düzgün base64 JSON olmalıdır");
  }
}

export function db(): Firestore {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(readServiceAccount()) });
  }
  return getFirestore();
}
