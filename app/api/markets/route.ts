import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { MarketStatus } from "@/app/generated/prisma/enums";
import { marketQuerySchema } from "@/lib/validations/market";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const result = marketQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const status = searchParams.get("status");
    const limit = Math.max(Number(searchParams.get("limit")) || 10);

    if (
      status !== null &&
      !Object.values(MarketStatus).includes(status as MarketStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid market status" },
        { status: 400 },
      );
    }

    const markets = await prisma.market.findMany({
      where: {
        status: status ? (status as MarketStatus) : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        question: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ markets }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch markets from database:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
