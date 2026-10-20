import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getTraderStandings } from "@/lib/leaderboard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const traderParamsSchema = z.object({
  id: z.uuid(),
});

const RECENT_BET_LIMIT = 20;

export async function GET(_request: Request, { params }: RouteContext) {
  const paramsResult = traderParamsSchema.safeParse(await params);

  if (!paramsResult.success) {
    return NextResponse.json({ error: "Trader not found" }, { status: 404 });
  }

  const { id } = paramsResult.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, image: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Trader not found" }, { status: 404 });
    }

    const [standings, openPositions, positions] = await Promise.all([
      getTraderStandings("all"),
      prisma.bet.count({
        where: { userId: id, market: { status: "OPEN" } },
      }),
      prisma.bet.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: RECENT_BET_LIMIT,
        select: {
          id: true,
          outcome: true,
          amount: true,
          createdAt: true,
          market: {
            select: {
              slug: true,
              question: true,
              category: true,
              status: true,
              closesAt: true,
            },
          },
        },
      }),
    ]);

    const rank = standings.findIndex((entry) => entry.userId === id);

    if (rank < 0) {
      return NextResponse.json({
        trader: {
          id: user.id,
          name: user.name,
          image: user.image,
          memberSince: user.createdAt,
          stats: {
            net: 0,
            volume: 0,
            bets: 0,
            wins: 0,
            openPositions,
            rank: null,
          },
        },
        positions: [],
      });
    }

    const standing = standings[rank];

    return NextResponse.json({
      trader: {
        id: user.id,
        name: user.name,
        image: user.image,
        memberSince: user.createdAt,
        stats: {
          net: standing.net,
          volume: standing.volume,
          bets: standing.bets,
          wins: standing.wins,
          openPositions,
          rank: rank + 1,
        },
      },
      positions,
    });
  } catch (error) {
    console.error("Failed to fetch trader:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
