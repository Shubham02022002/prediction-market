import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getTraderStandings } from "@/lib/leaderboard";
import { leaderboardQuerySchema } from "@/lib/validations/leaderboard";

export async function GET(request: NextRequest) {
  const result = leaderboardQuerySchema.safeParse({
    window: request.nextUrl.searchParams.get("window") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const { window, limit } = result.data;
  const session = await auth();
  const viewerId = session?.user?.id;

  try {
    const traders = await getTraderStandings(window);
    const top = traders.slice(0, limit);
    const topIds = top.map((entry) => entry.userId);

    const users = topIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topIds } },
          select: { id: true, name: true, image: true },
        })
      : [];

    const userById = new Map(users.map((user) => [user.id, user]));

    const entries = top.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: userById.get(entry.userId)?.name ?? "Trader",
      image: userById.get(entry.userId)?.image ?? null,
      net: entry.net,
      volume: entry.volume,
      bets: entry.bets,
      wins: entry.wins,
    }));

    let viewer = null;

    if (viewerId) {
      const rank = traders.findIndex((entry) => entry.userId === viewerId);

      if (rank >= 0) {
        const entry = traders[rank];

        viewer = {
          rank: rank + 1,
          net: entry.net,
          volume: entry.volume,
          bets: entry.bets,
          wins: entry.wins,
        };
      }
    }

    return NextResponse.json(
      {
        window,
        entries,
        viewer,
        totalTraders: traders.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
