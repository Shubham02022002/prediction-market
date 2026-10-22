import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const provided = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);

  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await prisma.market.updateMany({
    where: { status: "OPEN", closesAt: { lte: now } },
    data: { status: "CLOSED" },
  });

  return NextResponse.json({
    closed: result.count,
    ranAt: now.toISOString(),
  });
}
