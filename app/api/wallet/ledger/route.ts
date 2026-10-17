import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const ledgerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = ledgerQuerySchema.safeParse({
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

  try {
    const [entries, totalEntries] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          amount: true,
          type: true,
          createdAt: true,
          marketId: true,
          betId: true,
          market: { select: { slug: true, question: true } },
        },
      }),
      prisma.ledgerEntry.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json(
      {
        entries,
        pagination: {
          page,
          limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch ledger:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
