import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { betListQuerySchema } from "@/lib/validations/bet";

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

    return NextResponse.json(
      {
        bets,
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
