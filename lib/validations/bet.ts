import { z } from "zod";
import { Outcome } from "@/app/generated/prisma/enums";

export const betPlacementSchema = z.object({
  outcome: z.enum(Outcome),
  amount: z.number().int().positive().max(1_000_000),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Idempotency key is too short")
    .max(100, "Idempotency key is too long"),
});

export const betListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type BetPlacement = z.infer<typeof betPlacementSchema>;
