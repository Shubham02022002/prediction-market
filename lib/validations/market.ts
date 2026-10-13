import { z } from "zod";
import { MarketStatus } from "@/app/generated/prisma/enums";

export const marketQuerySchema = z.object({
  status: z.enum(MarketStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
