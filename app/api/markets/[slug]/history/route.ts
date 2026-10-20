import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildHistory, sampleHistory } from "@/lib/market-history";
import { marketParamsSchema } from "@/lib/validations/market";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const MAX_POINTS = 500;

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const rawParams = await params;
    const result = marketParamsSchema.safeParse(rawParams);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid URL parameters" },
        { status: 400 },
      );
    }

    const market = await prisma.market.findUnique({
      where: { slug: result.data.slug },
      select: { id: true, status: true },
    });

    if (!market || market.status === "DRAFT") {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const bets = await prisma.bet.findMany({
      where: { marketId: market.id },
      orderBy: { createdAt: "asc" },
      select: { outcome: true, amount: true, createdAt: true },
    });

    const history = sampleHistory(buildHistory(bets), MAX_POINTS);

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch market history:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
