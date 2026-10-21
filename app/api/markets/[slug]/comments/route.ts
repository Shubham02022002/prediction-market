import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { commentCreationSchema } from "@/lib/validations/comment";
import { marketParamsSchema } from "@/lib/validations/market";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const COMMENT_LIMIT = 100;

async function findMarket(slug: string) {
  return prisma.market.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const paramsResult = marketParamsSchema.safeParse(await params);

  if (!paramsResult.success) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  try {
    const market = await findMarket(paramsResult.data.slug);

    if (!market || market.status === "DRAFT") {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { marketId: market.id },
      orderBy: { createdAt: "desc" },
      take: COMMENT_LIMIT,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`comments:${session.user.id}`, {
    limit: 10,
    windowMs: 5 * 60_000,
  });

  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const paramsResult = marketParamsSchema.safeParse(await params);

  if (!paramsResult.success) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
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

  const bodyResult = commentCreationSchema.safeParse(requestBody);

  if (!bodyResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: bodyResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const market = await findMarket(paramsResult.data.slug);

    if (!market || market.status === "DRAFT") {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        userId: session.user.id,
        marketId: market.id,
        body: bodyResult.data.body,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
