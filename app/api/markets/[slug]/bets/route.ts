import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { betPlacementSchema } from "@/lib/validations/bet";
import { marketParamsSchema } from "@/lib/validations/market";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

class InsufficientBalanceError extends Error {}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`bets:${session.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const rawParams = await params;
  const paramsResult = marketParamsSchema.safeParse(rawParams);

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

  const bodyResult = betPlacementSchema.safeParse(requestBody);

  if (!bodyResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: bodyResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { outcome, amount, idempotencyKey } = bodyResult.data;
  const userId = session.user.id;
  const { slug } = paramsResult.data;

  const market = await prisma.market.findUnique({
    where: { slug },
    select: { id: true, status: true, closesAt: true },
  });

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  if (market.status !== "OPEN" || market.closesAt <= new Date()) {
    return NextResponse.json(
      { error: "Market is not open for betting" },
      { status: 409 },
    );
  }

  const existingBet = await prisma.bet.findUnique({
    where: {
      userId_idempotencyKey: { userId, idempotencyKey },
    },
    select: {
      id: true,
      marketId: true,
      outcome: true,
      amount: true,
      createdAt: true,
    },
  });

  if (existingBet) {
    const isSameRequest =
      existingBet.marketId === market.id &&
      existingBet.outcome === outcome &&
      existingBet.amount === amount;

    if (!isSameRequest) {
      return NextResponse.json(
        { error: "Idempotency key was already used for a different bet" },
        { status: 409 },
      );
    }

    return NextResponse.json({ bet: existingBet, replayed: true }, { status: 200 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const debit = await tx.wallet.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });

      if (debit.count === 0) {
        throw new InsufficientBalanceError();
      }

      const bet = await tx.bet.create({
        data: {
          userId,
          marketId: market.id,
          outcome,
          amount,
          idempotencyKey,
        },
        select: {
          id: true,
          marketId: true,
          outcome: true,
          amount: true,
          createdAt: true,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          marketId: market.id,
          betId: bet.id,
          type: "BET_STAKE",
          amount: -amount,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          marketId: market.id,
          action: "BET_PLACED",
          details: { betId: bet.id, outcome, amount },
        },
      });

      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      });

      return { bet, balance: wallet?.balance ?? 0 };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: "Insufficient credit balance" },
        { status: 409 },
      );
    }

    // A concurrent request with the same key won the race; return its bet.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raceBet = await prisma.bet.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
        select: {
          id: true,
          marketId: true,
          outcome: true,
          amount: true,
          createdAt: true,
        },
      });

      if (
        raceBet &&
        raceBet.marketId === market.id &&
        raceBet.outcome === outcome &&
        raceBet.amount === amount
      ) {
        return NextResponse.json({ bet: raceBet, replayed: true }, { status: 200 });
      }

      return NextResponse.json(
        { error: "Idempotency key was already used for a different bet" },
        { status: 409 },
      );
    }

    console.error("Failed to place bet:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
