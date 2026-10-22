import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { betListQuerySchema } from "@/lib/validations/bet";

const REALIZED_TYPES = [
  "BET_STAKE",
  "BET_PAYOUT",
  "REFUND",
  "POSITION_SALE",
] as const;

type PoolKey = `${string}:${"YES" | "NO"}`;

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = betListQuerySchema.safeParse({
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const { page, limit } = result.data;
  const userId = session.user.id;

  try {
    const [bets, totalBets] = await Promise.all([
      prisma.bet.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          marketId: true,
          outcome: true,
          amount: true,
          createdAt: true,
          market: {
            select: {
              slug: true,
              question: true,
              status: true,
              closesAt: true,
            },
          },
        },
      }),
      prisma.bet.count({ where: { userId } }),
    ]);

    const [openBets, realized] = await Promise.all([
      prisma.bet.findMany({
        where: { userId, market: { status: "OPEN" } },
        select: { marketId: true, outcome: true, amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: {
          userId,
          type: { in: [...REALIZED_TYPES] },
          market: { status: { in: ["RESOLVED", "VOID"] } },
        },
        _sum: { amount: true },
      }),
    ]);

    const poolMarketIds = [
      ...new Set([
        ...bets.map((bet) => bet.marketId),
        ...openBets.map((bet) => bet.marketId),
      ]),
    ];

    const poolRows = poolMarketIds.length
      ? await prisma.bet.groupBy({
          by: ["marketId", "outcome"],
          where: { marketId: { in: poolMarketIds } },
          _sum: { amount: true },
        })
      : [];

    const pools = new Map<PoolKey, number>();
    const marketTotals = new Map<string, number>();

    for (const row of poolRows) {
      const amount = row._sum.amount ?? 0;
      pools.set(`${row.marketId}:${row.outcome}` as PoolKey, amount);
      marketTotals.set(
        row.marketId,
        (marketTotals.get(row.marketId) ?? 0) + amount,
      );
    }

    function potentialFor(
      marketId: string,
      outcome: "YES" | "NO",
      amount: number,
    ) {
      const total = marketTotals.get(marketId) ?? 0;
      const side = pools.get(`${marketId}:${outcome}` as PoolKey) ?? 0;

      if (total === 0 || side === 0) {
        return null;
      }

      return Math.floor((amount * total) / side);
    }

    let atStake = 0;
    let potentialPayout = 0;

    for (const bet of openBets) {
      atStake += bet.amount;
      potentialPayout +=
        potentialFor(bet.marketId, bet.outcome, bet.amount) ?? 0;
    }

    const enrichedBets = bets.map((bet) => {
      const potential =
        bet.market.status === "OPEN"
          ? potentialFor(bet.marketId, bet.outcome, bet.amount)
          : null;

      return {
        ...bet,
        potentialPayout: potential,
        multiplier:
          potential === null ? null : Number((potential / bet.amount).toFixed(2)),
      };
    });

    return NextResponse.json(
      {
        bets: enrichedBets,
        summary: {
          realizedNet: realized._sum.amount ?? 0,
          atStake,
          potentialPayout,
          openBets: openBets.length,
        },
        pagination: {
          page,
          limit,
          totalBets,
          totalPages: Math.ceil(totalBets / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch bets:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
