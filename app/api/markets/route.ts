import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/authorization";
import { sampleHistory } from "@/lib/market-history";
import {
  marketQuerySchema,
  marketCreationSchema,
} from "@/lib/validations/market";

const MOVER_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = marketQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      watching: searchParams.get("watching") === "true",
      sort: searchParams.get("sort") ?? undefined,
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
    const { status, category, q, watching, sort, page, limit } = result.data;

    const session = await auth();
    const userId = session?.user?.id;

    if (watching && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: Prisma.MarketWhereInput = {
      status:
        status && status !== "DRAFT" ? status : { not: "DRAFT" },
      category,
    };

    if (q) {
      where.OR = [
        { question: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    if (watching && userId) {
      where.watchlist = { some: { userId } };
    }

    const [matchingMarkets, categoryRows] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
      prisma.market.findMany({
        where: { status: { not: "DRAFT" } },
        distinct: ["category"],
        orderBy: { category: "asc" },
        select: { category: true },
      }),
    ]);

    const marketIds = matchingMarkets.map((market) => market.id);
    const marketBets = marketIds.length
      ? await prisma.bet.findMany({
          where: { marketId: { in: marketIds } },
          orderBy: { createdAt: "asc" },
          select: {
            marketId: true,
            outcome: true,
            amount: true,
            createdAt: true,
          },
        })
      : [];

    const watchedIds = new Set<string>();

    if (userId && marketIds.length) {
      const watches = await prisma.watchlist.findMany({
        where: { userId, marketId: { in: marketIds } },
        select: { marketId: true },
      });

      for (const watch of watches) {
        watchedIds.add(watch.marketId);
      }
    }

    const cutoff = Date.now() - MOVER_WINDOW_MS;
    const poolByMarket = new Map<
      string,
      {
        yes: number;
        no: number;
        spark: number[];
        baseline: number | null;
        latest: number | null;
      }
    >();

    for (const bet of marketBets) {
      const entry = poolByMarket.get(bet.marketId) ?? {
        yes: 0,
        no: 0,
        spark: [],
        baseline: null,
        latest: null,
      };

      if (bet.outcome === "YES") {
        entry.yes += bet.amount;
      } else {
        entry.no += bet.amount;
      }

      const total = entry.yes + entry.no;
      const percentage = (entry.yes / total) * 100;

      if (entry.baseline === null || bet.createdAt.getTime() <= cutoff) {
        entry.baseline = percentage;
      }
      entry.latest = percentage;
      entry.spark.push(percentage);
      poolByMarket.set(bet.marketId, entry);
    }

    const enriched = matchingMarkets.map((market) => {
      const entry = poolByMarket.get(market.id);
      const yes = entry?.yes ?? 0;
      const no = entry?.no ?? 0;
      const total = yes + no;
      const spark =
        entry && entry.spark.length >= 2 ? sampleHistory(entry.spark, 24) : [];
      const movement =
        entry?.baseline != null && entry.latest != null
          ? Math.abs(entry.latest - entry.baseline)
          : 0;

      return {
        ...market,
        pool: {
          yes,
          no,
          total,
          yesPercentage: total === 0 ? 0 : (yes / total) * 100,
          noPercentage: total === 0 ? 0 : (no / total) * 100,
        },
        spark,
        movement,
        watched: watchedIds.has(market.id),
      };
    });

    enriched.sort((a, b) => {
      switch (sort) {
        case "volume":
          return b.pool.total - a.pool.total;
        case "closing":
          return a.closesAt.getTime() - b.closesAt.getTime();
        case "movers":
          return b.movement - a.movement || b.pool.total - a.pool.total;
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    const totalMarkets = enriched.length;
    const totalPages = Math.ceil(totalMarkets / limit);
    const safePage = Math.min(page, Math.max(1, totalPages));
    const marketsWithPools = enriched.slice(
      (safePage - 1) * limit,
      safePage * limit,
    );

    return NextResponse.json(
      {
        markets: marketsWithPools,
        categories: categoryRows.map((row) => row.category),
        pagination: {
          page: safePage,
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
