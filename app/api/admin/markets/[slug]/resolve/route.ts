import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma";
import {
  marketParamsSchema,
  marketResolutionSchema,
} from "@/lib/validations/market";
import { computeSettlement } from "@/lib/settlement";

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
        select: { id: true, status: true, question: true },
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

      const settlement = computeSettlement(bets, outcome);
      const payouts = settlement.payouts.map((payout) => ({
        userId: payout.userId,
        marketId: existing.id,
        betId: payout.betId,
        type: "BET_PAYOUT" as const,
        amount: payout.amount,
      }));
      const payoutsByUser = new Map<string, number>();

      for (const payout of settlement.payouts) {
        payoutsByUser.set(
          payout.userId,
          (payoutsByUser.get(payout.userId) ?? 0) + payout.amount,
        );
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

      const watchers = await tx.watchlist.findMany({
        where: { marketId: existing.id },
        select: { userId: true },
      });

      const recipientIds = new Set([
        ...bets.map((bet) => bet.userId),
        ...watchers.map((watch) => watch.userId),
      ]);

      if (recipientIds.size > 0) {
        await tx.notification.createMany({
          data: [...recipientIds].map((userId) => ({
            userId,
            marketId: existing.id,
            type: "MARKET_RESOLVED",
            title: `Market resolved ${outcome}`,
            body: existing.question,
          })),
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
            totalPool: settlement.totalPool,
            winningPool: settlement.winningPool,
            totalPayout: settlement.totalPayout,
            winnerCount: settlement.winnerCount,
            dust: settlement.dust,
          },
        },
      });

      return {
        market: { slug, status: "RESOLVED" as const },
        resolution,
        settlement: {
          outcome,
          totalPool: settlement.totalPool,
          winningPool: settlement.winningPool,
          losingPool: settlement.losingPool,
          winnerCount: settlement.winnerCount,
          totalPayout: settlement.totalPayout,
          dust: settlement.dust,
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
