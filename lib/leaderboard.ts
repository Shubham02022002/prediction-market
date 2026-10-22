import prisma from "@/lib/prisma";
import {
  WINDOW_DURATION_MS,
  type LeaderboardWindow,
} from "@/lib/validations/leaderboard";

const PROFIT_TYPES = [
  "BET_STAKE",
  "BET_PAYOUT",
  "REFUND",
  "POSITION_SALE",
] as const;

export type TraderStanding = {
  userId: string;
  net: number;
  volume: number;
  bets: number;
  wins: number;
};

export async function getTraderStandings(
  window: LeaderboardWindow = "all",
): Promise<TraderStanding[]> {
  const duration = WINDOW_DURATION_MS[window];
  const since = duration === null ? undefined : new Date(Date.now() - duration);
  const windowFilter = since ? { createdAt: { gte: since } } : {};

  const [profitRows, stakeRows, payoutRows] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ["userId"],
      where: { type: { in: [...PROFIT_TYPES] }, ...windowFilter },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["userId"],
      where: { type: "BET_STAKE", ...windowFilter },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["userId"],
      where: { type: "BET_PAYOUT", ...windowFilter },
      _count: { _all: true },
    }),
  ]);

  const stakeById = new Map(
    stakeRows.map((row) => [
      row.userId,
      { volume: Math.abs(row._sum.amount ?? 0), bets: row._count._all },
    ]),
  );

  const winsById = new Map(
    payoutRows.map((row) => [row.userId, row._count._all]),
  );

  return profitRows
    .filter((row) => stakeById.has(row.userId))
    .map((row) => {
      const stake = stakeById.get(row.userId);

      return {
        userId: row.userId,
        net: row._sum.amount ?? 0,
        volume: stake?.volume ?? 0,
        bets: stake?.bets ?? 0,
        wins: winsById.get(row.userId) ?? 0,
      };
    })
    .sort((a, b) => b.net - a.net || b.volume - a.volume);
}
