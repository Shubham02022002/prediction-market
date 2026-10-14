import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { marketParamsSchema } from "@/lib/validations/market";

export async function GET({ params }: { params: Promise<{ slug: string }> }) {
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
      where: {
        slug,
      },
      select: {
        id: true,
        slug: true,
        question: true,
        category: true,
        status: true,
        closesAt: true,
      },
    });
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }
    return NextResponse.json({ market }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch market from database:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
