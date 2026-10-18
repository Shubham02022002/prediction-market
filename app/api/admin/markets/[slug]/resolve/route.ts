import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma";
import {
  marketParamsSchema,
  marketResolutionSchema,
} from "@/lib/validations/market";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
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

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON in request body" },
      { status: 400 },
    );
  }

  const bodyResult = marketResolutionSchema.safeParse(requestBody);

  if (!bodyResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: bodyResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { slug } = paramsResult.data;
  const { outcome, notes, evidenceUrl } = bodyResult.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.market.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new ApiError(404, "Market not found");
      }

      if (existing.status !== "CLOSED") {
        throw new ApiError(409, "Only closed markets can be resolved");
      }

      const claimed = await tx.market.updateMany({
        where: { id: existing.id, status: "CLOSED" },
        data: { status: "RESOLVED" },
      });

      if (claimed.count === 0) {
        throw new ApiError(409, "Market status changed; refresh and retry");
      }

      const bets = await tx.bet.findMany({
        where: { marketId: existing.id },
        select: {
          id: true,
          userId: true,
          outcome: true,
          amount: true,
        },
      });

      const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
      const winningBets = bets.filter((bet) => bet.outcome === outcome);
      const winningPool = winningBets.reduce(
        (sum, bet) => sum + bet.amount,
        0,
      );

      const payouts: {
        userId: string;
        marketId: string;
        betId: string;
        type: "BET_PAYOUT";
        amount: number;
      }[] = [];
      const payoutsByUser = new Map<string, number>();
      let totalPayout = 0;

      if (winningPool > 0) {
        for (const bet of winningBets) {
          const payout = Math.floor((bet.amount * totalPool) / winningPool);

          if (payout === 0) {
            continue;
          }

          payouts.push({
            userId: bet.userId,
            marketId: existing.id,
            betId: bet.id,
            type: "BET_PAYOUT",
            amount: payout,
          });
          payoutsByUser.set(
            bet.userId,
            (payoutsByUser.get(bet.userId) ?? 0) + payout,
          );
          totalPayout += payout;
        }
      }

      if (payouts.length > 0) {
        await tx.ledgerEntry.createMany({ data: payouts });
      }

      for (const [userId, amount] of payoutsByUser) {
        await tx.wallet.updateMany({
          where: { userId },
          data: { balance: { increment: amount } },
        });
      }

      const resolution = await tx.marketResolution.create({
        data: {
          marketId: existing.id,
          outcome,
          notes: notes || null,
          evidenceUrl: evidenceUrl || null,
          resolvedBy: admin.userId,
        },
        select: {
          id: true,
          outcome: true,
          notes: true,
          evidenceUrl: true,
          resolvedAt: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: admin.userId,
          marketId: existing.id,
          action: "MARKET_RESOLVED",
          details: {
            slug,
            outcome,
            totalPool,
            winningPool,
            totalPayout,
            winnerCount: winningBets.length,
            dust: totalPool - totalPayout,
          },
        },
      });

      return {
        market: { slug, status: "RESOLVED" as const },
        resolution,
        settlement: {
          outcome,
          totalPool,
          winningPool,
          losingPool: totalPool - winningPool,
          winnerCount: winningBets.length,
          totalPayout,
          dust: totalPool - totalPayout,
        },
      };
    }, { maxWait: 10_000, timeout: 15_000 });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    console.error("Failed to resolve market:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
