export interface MergeInput {
  id: string;
  gtin: string | null;
  nameKey: string | null;
  createdAt: number;
}

export interface MergePlan {
  merges: { from: string; into: string }[];
  ambiguous: { nameKey: string; ids: string[] }[];
}

function earliest(items: MergeInput[]): MergeInput {
  return [...items].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))[0] as MergeInput;
}

export function planMerges(products: MergeInput[]): MergePlan {
  const merges: { from: string; into: string }[] = [];
  const gone = new Set<string>();

  const byGtin = new Map<string, MergeInput[]>();
  for (const product of products) {
    if (!product.gtin) continue;
    const list = byGtin.get(product.gtin);
    if (list) list.push(product);
    else byGtin.set(product.gtin, [product]);
  }
  for (const group of byGtin.values()) {
    if (group.length < 2) continue;
    const keep = earliest(group);
    for (const other of group) {
      if (other.id === keep.id) continue;
      merges.push({ from: other.id, into: keep.id });
      gone.add(other.id);
    }
  }

  const byName = new Map<string, MergeInput[]>();
  for (const product of products) {
    if (!product.nameKey || gone.has(product.id)) continue;
    const list = byName.get(product.nameKey);
    if (list) list.push(product);
    else byName.set(product.nameKey, [product]);
  }

  const ambiguous: MergePlan["ambiguous"] = [];
  for (const [nameKey, group] of byName) {
    if (group.length < 2) continue;
    const withGtin = group.filter((p) => p.gtin);
    const distinct = new Set(withGtin.map((p) => p.gtin));
    if (distinct.size >= 2) {
      const loose = group.filter((p) => !p.gtin);
      if (loose.length > 0) ambiguous.push({ nameKey, ids: loose.map((p) => p.id) });
      continue;
    }
    const keep = distinct.size === 1 ? (withGtin[0] as MergeInput) : earliest(group);
    for (const other of group) {
      if (other.id === keep.id) continue;
      merges.push({ from: other.id, into: keep.id });
    }
  }
  return { merges, ambiguous };
}
