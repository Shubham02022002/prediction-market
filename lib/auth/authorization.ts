import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 };

export async function requireAdmin(): Promise<AdminCheck> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return { ok: false, status: 403 };
  }

  return { ok: true, userId: session.user.id };
}
