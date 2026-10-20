import { z } from "zod";

export const LEADERBOARD_WINDOWS = ["all", "30d", "7d"] as const;

export type LeaderboardWindow = (typeof LEADERBOARD_WINDOWS)[number];

export const leaderboardQuerySchema = z.object({
  window: z.enum(LEADERBOARD_WINDOWS).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export const WINDOW_DURATION_MS: Record<LeaderboardWindow, number | null> = {
  all: null,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};
