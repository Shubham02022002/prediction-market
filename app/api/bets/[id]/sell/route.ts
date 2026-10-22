import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import prisma from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.uuid(),
});

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`sell:${session.user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });

  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const paramsResult = paramsSchema.safeParse(await params);

  if (!paramsResult.success) {
    return NextResponse.json(
      { error: "Invalid URL parameters" },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const betId = paramsResult.data.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findFirst({
        where: { id: betId, userId },
        select: {
          id: true,
          marketId: true,
          amount: true,
          market: {
            select: { slug: true, status: true, closesAt: true },
          },
        },
      });

      if (!bet) {
        throw new ApiError(404, "Position not found");
      }

      if (bet.market.status !== "OPEN" || bet.market.closesAt <= new Date()) {
        throw new ApiError(
          409,
          "Positions can only be sold while the market is open",
        );
      }

      // Updating the market row locks it so a concurrent close waits for this
      // sale, and a close that lands first makes the claim fail.
      const claim = await tx.market.updateMany({
        where: { id: bet.marketId, status: "OPEN" },
        data: { status: "OPEN" },
      });

      if (claim.count === 0) {
        throw new ApiError(409, "Market status changed; refresh and retry");
      }

      await tx.bet.delete({ where: { id: bet.id } });

      await tx.ledgerEntry.create({
        data: {
          userId,
          marketId: bet.marketId,
          type: "POSITION_SALE",
          amount: bet.amount,
        },
      });

      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: bet.amount } },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          marketId: bet.marketId,
          action: "POSITION_SOLD",
          details: { betId: bet.id, amount: bet.amount },
        },
      });

      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      });

      return {
        sold: {
          betId: bet.id,
          slug: bet.market.slug,
          amount: bet.amount,
        },
        balance: wallet?.balance ?? 0,
      };
    }, { maxWait: 10_000, timeout: 15_000 });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    console.error("Failed to sell position:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
