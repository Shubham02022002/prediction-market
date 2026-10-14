import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { marketQuerySchema } from "@/lib/validations/market";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = marketQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      category: searchParams.get("category") ?? undefined,
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
    const { status, category, page, limit } = result.data;
    const where = {
      status,
      category,
    };
    const [markets, totalMarkets] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.market.count({ where }),
    ]);
    const totalPages = Math.ceil(totalMarkets / limit);
    return NextResponse.json(
      {
        markets,
        pagination: {
          page,
          limit,
          totalMarkets,
          totalPages,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch markets from database:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
