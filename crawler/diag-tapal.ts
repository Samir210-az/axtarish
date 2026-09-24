import { db } from "../lib/firebaseAdmin";
import { offerDocSchema } from "../lib/schemas";

async function main() {
  const snap = await db().collection("offers").where("sourceId", "==", "tapal").get();
  let valid = 0;
  let invalid = 0;
  const keys = new Set<string>();
  const types = new Map<string, number>();
  const sample: string[] = [];
  for (const doc of snap.docs) {
    const parsed = offerDocSchema.safeParse(doc.data());
    if (parsed.success) {
      valid += 1;
      keys.add(parsed.data.sellerKey);
      types.set(
        `${parsed.data.sellerType}/${parsed.data.sourceType}`,
        (types.get(`${parsed.data.sellerType}/${parsed.data.sourceType}`) ?? 0) + 1,
      );
      if (sample.length < 3)
        sample.push(
          `${parsed.data.priceAzn} ₼ | sellerName=${String(parsed.data.sellerName)} | sellerKey=${parsed.data.sellerKey.slice(0, 8)}… | status=${parsed.data.status}`,
        );
    } else {
      invalid += 1;
    }
  }
  console.log(
    `tapal offer: cəmi=${snap.size}, sxemə uyğun=${valid}, uyğunsuz=${invalid}, fərqli satıcı açarı=${keys.size}`,
  );
  console.log(`növlər: ${JSON.stringify([...types.entries()])}`);
  console.log(`nümunə:\n  ${sample.join("\n  ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
