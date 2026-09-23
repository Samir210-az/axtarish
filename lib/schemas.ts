import { z } from "zod";
import { AUTHENTICITY, SELLER_TYPES, SOURCE_TYPES, VARIANTS } from "./types";

const timestampLike = z.custom<{ toDate: () => Date }>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === "function",
);

export const productDocSchema = z.object({
  displayName: z.string().min(1),
  brand: z.string().default(""),
  model: z.string().default(""),
  category: z.string().min(1),
  variant: z.enum(VARIANTS).nullable().default(null),
  volumeMl: z.number().positive().nullable().default(null),
  aliases: z.array(z.string()).default([]),
});

export const offerDocSchema = z.object({
  productId: z.string().min(1),
  priceAzn: z.number().positive().finite(),
  oldPriceAzn: z.number().positive().finite().nullable().default(null),
  authenticity: z.enum(AUTHENTICITY).default("unknown"),
  sourceType: z.enum(SOURCE_TYPES),
  sellerType: z.enum(SELLER_TYPES),
  sellerKey: z.string().min(1),
  sellerName: z.string().nullable().default(null),
  sellerUrl: z.string().nullable().default(null),
  effectiveAt: timestampLike,
});
