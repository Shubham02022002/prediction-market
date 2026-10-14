import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
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
    const requestBody = await request.json();
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
