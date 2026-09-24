import { createHash } from "node:crypto";
import type { Identity } from "./identity";

export interface KnownKey {
  productId: string;
  gtin: string | null;
}

export interface KeyRegistration {
  key: string;
  kind: "gtin" | "name";
  gtin: string | null;
}

export interface Resolution {
  productId: string;
  registered: KeyRegistration[];
  conflictWith: string | null;
  adoptGtin: boolean;
}

type KeyFields = Pick<Identity, "gtin" | "nameKey" | "productId">;

export function keysOf(identity: Pick<Identity, "gtin" | "nameKey">): string[] {
  const keys: string[] = [];
  if (identity.gtin) keys.push(`gtin:${identity.gtin}`);
  if (identity.nameKey) keys.push(`name:${identity.nameKey}`);
  return keys;
}

export function keyDocId(key: string): string {
  return createHash("sha1").update(key).digest("hex").slice(0, 24);
}

export function resolveIdentity(identity: KeyFields, known: Map<string, KnownKey>): Resolution {
  const gtinKey = identity.gtin ? `gtin:${identity.gtin}` : null;
  const nameKey = identity.nameKey ? `name:${identity.nameKey}` : null;
  const byGtin = gtinKey ? known.get(gtinKey) : undefined;
  const byName = nameKey ? known.get(nameKey) : undefined;
  const nameClashes = Boolean(identity.gtin && byName?.gtin && byName.gtin !== identity.gtin);

  let productId: string;
  let conflictWith: string | null = null;
  let adoptGtin = false;
  if (byGtin) {
    productId = byGtin.productId;
    if (byName && !nameClashes && byName.productId !== productId) conflictWith = byName.productId;
  } else if (byName && !nameClashes) {
    productId = byName.productId;
    adoptGtin = Boolean(identity.gtin) && byName.gtin === null;
  } else {
    productId = identity.productId;
  }

  const registered: KeyRegistration[] = [];
  if (gtinKey && !byGtin) {
    registered.push({ key: gtinKey, kind: "gtin", gtin: identity.gtin });
    known.set(gtinKey, { productId, gtin: identity.gtin });
  }
  if (nameKey && !byName) {
    registered.push({ key: nameKey, kind: "name", gtin: identity.gtin });
    known.set(nameKey, { productId, gtin: identity.gtin });
  } else if (nameKey && byName && adoptGtin) {
    registered.push({ key: nameKey, kind: "name", gtin: identity.gtin });
    known.set(nameKey, { productId, gtin: identity.gtin });
  }
  return { productId, registered, conflictWith, adoptGtin };
}
