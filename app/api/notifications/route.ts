import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const MAX_NOTIFICATIONS = 50;

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const countOnly =
    new URL(request.url).searchParams.get("count") === "true";

  if (countOnly) {
    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null },
    });

    return NextResponse.json({ unreadCount });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAX_NOTIFICATIONS,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
        market: { select: { slug: true, status: true } },
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}
