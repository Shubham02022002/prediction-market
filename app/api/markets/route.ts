import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  marketQuerySchema,
  marketCreationSchema,
} from "@/lib/validations/market";

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
      status: status && status !== "DRAFT" ? status : { not: "DRAFT" as const },
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
          closesAt: true,
          createdAt: true,
        },
      }),
      prisma.market.count({ where }),
    ]);
    const totalPages = Math.ceil(totalMarkets / limit);

    const marketIds = markets.map((market) => market.id);
    const pools = marketIds.length
      ? await prisma.bet.groupBy({
          by: ["marketId", "outcome"],
          where: { marketId: { in: marketIds } },
          _sum: { amount: true },
        })
      : [];

    const poolByMarket = new Map<string, { yes: number; no: number }>();

    for (const row of pools) {
      const entry = poolByMarket.get(row.marketId) ?? { yes: 0, no: 0 };
      if (row.outcome === "YES") {
        entry.yes = row._sum.amount ?? 0;
      } else {
        entry.no = row._sum.amount ?? 0;
      }
      poolByMarket.set(row.marketId, entry);
    }

    const marketsWithPools = markets.map((market) => {
      const { yes, no } = poolByMarket.get(market.id) ?? { yes: 0, no: 0 };
      const total = yes + no;

      return {
        ...market,
        pool: {
          yes,
          no,
          total,
          yesPercentage: total === 0 ? 0 : (yes / total) * 100,
          noPercentage: total === 0 ? 0 : (no / total) * 100,
        },
      };
    });

    return NextResponse.json(
      {
        markets: marketsWithPools,
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

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: admin.status },
    );
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON in request body" },
      { status: 400 },
    );
  }

  try {
    const result = marketCreationSchema.safeParse(requestBody);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: result.error.flatten(),
        },
        { status: 400 },
      );
    }
    const { slug, question, description, category, closesAt, rules } =
      result.data;
      
    const isExistingMarket = await prisma.market.findUnique({
      where: {
        slug,
      },
    });

    if (isExistingMarket) {
      return NextResponse.json(
        {
          error: "Market already exist.",
        },
        { status: 409 },
      );
    }

    const market = await prisma.market.create({
      data: {
        slug,
        question,
        description,
        rules,
        category,
        closesAt: new Date(closesAt),
        status: "DRAFT",
      },
    });
    return NextResponse.json({ market }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Market slug already exists" },
        { status: 409 },
      );
    }
    console.error("Error creating market:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
