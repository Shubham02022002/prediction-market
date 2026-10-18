import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma";
import { marketParamsSchema } from "@/lib/validations/market";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: admin.status },
    );
  }

  const paramsResult = marketParamsSchema.safeParse(await params);

  if (!paramsResult.success) {
    return NextResponse.json(
      { error: "Invalid URL parameters" },
      { status: 400 },
    );
  }

  const { slug } = paramsResult.data;

  try {
    const market = await prisma.$transaction(async (tx) => {
      const existing = await tx.market.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new ApiError(404, "Market not found");
      }

      if (existing.status !== "OPEN") {
        throw new ApiError(409, "Only open markets can be closed");
      }

      const claimed = await tx.market.updateMany({
        where: { id: existing.id, status: "OPEN" },
        data: { status: "CLOSED" },
      });

      if (claimed.count === 0) {
        throw new ApiError(409, "Market status changed; refresh and retry");
      }

      await tx.auditEvent.create({
        data: {
          userId: admin.userId,
          marketId: existing.id,
          action: "MARKET_CLOSED",
          details: { slug },
        },
      });

      return { slug, status: "CLOSED" as const };
    }, { maxWait: 10_000, timeout: 15_000 });

    return NextResponse.json({ market });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    console.error("Failed to close market:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
