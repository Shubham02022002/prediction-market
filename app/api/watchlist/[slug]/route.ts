import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { marketParamsSchema } from "@/lib/validations/market";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

async function resolveMarketId(rawParams: Promise<{ slug: string }>) {
  const parsed = marketParamsSchema.safeParse(await rawParams);

  if (!parsed.success) {
    return { error: "Invalid URL parameters", status: 400 as const };
  }

  const market = await prisma.market.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true, status: true },
  });

  if (!market || market.status === "DRAFT") {
    return { error: "Market not found", status: 404 as const };
  }

  return { marketId: market.id };
}

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveMarketId(params);

  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  await prisma.watchlist.upsert({
    where: {
      userId_marketId: {
        userId: session.user.id,
        marketId: resolved.marketId,
      },
    },
    create: {
      userId: session.user.id,
      marketId: resolved.marketId,
    },
    update: {},
  });

  return NextResponse.json({ watched: true }, { status: 200 });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveMarketId(params);

  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  await prisma.watchlist.deleteMany({
    where: {
      userId: session.user.id,
      marketId: resolved.marketId,
    },
  });

  return NextResponse.json({ watched: false }, { status: 200 });
}
