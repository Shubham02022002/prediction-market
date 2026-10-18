import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma";
import {
  marketParamsSchema,
  marketVoidSchema,
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

  let requestBody: unknown = {};

  try {
    const text = await request.text();
    requestBody = text.trim() ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON in request body" },
      { status: 400 },
    );
  }

  const bodyResult = marketVoidSchema.safeParse(requestBody);

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
  const { notes } = bodyResult.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.market.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new ApiError(404, "Market not found");
      }

      if (existing.status !== "OPEN" && existing.status !== "CLOSED") {
        throw new ApiError(409, "Only open or closed markets can be voided");
      }

      const claimed = await tx.market.updateMany({
        where: {
          id: existing.id,
          status: { in: ["OPEN", "CLOSED"] },
        },
        data: { status: "VOID" },
      });

      if (claimed.count === 0) {
        throw new ApiError(409, "Market status changed; refresh and retry");
      }

      const bets = await tx.bet.findMany({
        where: { marketId: existing.id },
        select: {
          id: true,
          userId: true,
          amount: true,
        },
      });

      const refunds: {
        userId: string;
        marketId: string;
        betId: string;
        type: "REFUND";
        amount: number;
      }[] = [];
      const refundsByUser = new Map<string, number>();
      let refundedAmount = 0;

      for (const bet of bets) {
        refunds.push({
          userId: bet.userId,
          marketId: existing.id,
          betId: bet.id,
          type: "REFUND",
          amount: bet.amount,
        });
        refundsByUser.set(
          bet.userId,
          (refundsByUser.get(bet.userId) ?? 0) + bet.amount,
        );
        refundedAmount += bet.amount;
      }

      if (refunds.length > 0) {
        await tx.ledgerEntry.createMany({ data: refunds });
      }

      for (const [userId, amount] of refundsByUser) {
        await tx.wallet.updateMany({
          where: { userId },
          data: { balance: { increment: amount } },
        });
      }

      await tx.auditEvent.create({
        data: {
          userId: admin.userId,
          marketId: existing.id,
          action: "MARKET_VOIDED",
          details: {
            slug,
            refundedBets: bets.length,
            refundedAmount,
            notes: notes ?? null,
          },
        },
      });

      return {
        market: { slug, status: "VOID" as const },
        refund: {
          betCount: bets.length,
          amount: refundedAmount,
        },
      };
    }, { maxWait: 10_000, timeout: 15_000 });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    console.error("Failed to void market:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
