import { z } from "zod";
import { MarketStatus, Outcome } from "@/app/generated/prisma/enums";

export const marketSortSchema = z
  .enum(["newest", "closing", "volume", "movers"])
  .default("newest");

export const marketQuerySchema = z.object({
  status: z.enum(MarketStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().trim().min(2).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  watching: z.boolean().default(false),
  sort: marketSortSchema,
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .trim()
  .min(3, "Slug must be at least 3 characters long")
  .max(100, "Slug is too long")
  .regex(slugRegex, "Invalid slug format (must be kebab-case lowercase)");

export const marketParamsSchema = z.object({
  slug: slugSchema,
});

export const marketCreationSchema = z.object({
  slug: slugSchema,
  question: z
    .string()
    .trim()
    .min(5, "Question must be at least 5 characters long")
    .max(100, "Question is too long"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long")
    .max(200, "Description is too long"),
  rules: z
    .string()
    .trim()
    .min(5, "Rules must be at least 5 characters long")
    .max(100, "Rules are too long"),
  category: z
    .string()
    .trim()
    .min(2, "Category must be at least 2 characters long")
    .max(20, "Category is too long"),
  closesAt: z.iso
    .datetime()
    .refine(
      (value) => new Date(value).getTime() > Date.now(),
      "Closing date must be in the future",
    ),
});

export const marketResolutionSchema = z.object({
  outcome: z.enum(Outcome),
  notes: z.string().trim().max(2000).optional(),
  evidenceUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine(
      (value) => !value || z.url().safeParse(value).success,
      "Evidence URL must be a valid URL",
    ),
});

export const marketVoidSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

export type MarketQuery = z.infer<typeof marketQuerySchema>;
export type MarketParams = z.infer<typeof marketParamsSchema>;
export type MarketCreation = z.infer<typeof marketCreationSchema>;
