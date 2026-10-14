import { z } from "zod";
import { MarketStatus } from "@/app/generated/prisma/enums";

export const marketQuerySchema = z.object({
  status: z.enum(MarketStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const marketParamsSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters long")
    .max(100, "Slug is too long")
    .regex(slugRegex, "Invalid slug format (must be kebab-case lowercase)"),
});

export type MarketQuery = z.infer<typeof marketQuerySchema>;
export type MarketParams = z.infer<typeof marketParamsSchema>;
