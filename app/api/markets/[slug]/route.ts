import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { marketParamsSchema } from "@/lib/validations/market";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const rawParams = await params;
    const result = marketParamsSchema.safeParse(rawParams);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid URL parameters",
          details: result.error.format(),
        },
        { status: 400 },
      );
    }

    const { slug } = result.data;

    const market = await prisma.market.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        question: true,
        description: true,
        rules: true,
        category: true,
        status: true,
        closesAt: true,
        createdAt: true,
        resolution: {
          select: {
            outcome: true,
            notes: true,
            evidenceUrl: true,
            resolvedAt: true,
          },
        },
      },
    });

    if (!market || market.status === "DRAFT") {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }
    const yesBets = await prisma.bet.aggregate({
      where: {
        marketId: market?.id,
        outcome: "YES",
      },
      _sum: {
        amount: true,
      },
    });
    const noBets = await prisma.bet.aggregate({
      where: {
        marketId: market?.id,
        outcome: "NO",
      },
      _sum: {
        amount: true,
      },
    });

    const yesPool = yesBets._sum.amount ?? 0;
    const noPool = noBets._sum.amount ?? 0;

    const totalPool = yesPool + noPool;

    const yesPercentage = totalPool === 0 ? 0 : (yesPool / totalPool) * 100;
    const noPercentage = totalPool === 0 ? 0 : (noPool / totalPool) * 100;

    return NextResponse.json(
      {
        market,
        pool: {
          yes: yesPool,
          no: noPool,
          total: totalPool,
          yesPercentage,
          noPercentage,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch market:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
