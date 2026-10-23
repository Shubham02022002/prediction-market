import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const requestSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(20, "Password is too long."),
});

const INVALID_LINK_MESSAGE =
  "This reset link is invalid or has expired. Request a new one.";

export async function POST(request: Request) {
  const limit = rateLimit(`reset:ip:${clientIp(request)}`, {
    limit: 10,
    windowMs: 60 * 60_000,
  });

  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSeconds);
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

  const result = requestSchema.safeParse(requestBody);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const { token, password } = result.data;

  if (Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json(
      { error: "Password exceeds the maximum supported length" },
      { status: 400 },
    );
  }

  const tokenHash = hashResetToken(token);
  const now = new Date();

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!record || record.expiresAt <= now) {
      if (record) {
        await prisma.passwordResetToken
          .delete({ where: { id: record.id } })
          .catch(() => undefined);
      }

      return NextResponse.json({ error: INVALID_LINK_MESSAGE }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Deleting the token first claims it, so a replayed request cannot win.
    const updated = await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.passwordResetToken.deleteMany({
          where: { id: record.id, expiresAt: { gt: now } },
        });

        if (claimed.count === 0) {
          return false;
        }

        await tx.user.update({
          where: { id: record.userId },
          data: { passwordHash },
        });

        await tx.passwordResetToken.deleteMany({
          where: { userId: record.userId },
        });

        return true;
      },
      { maxWait: 10_000, timeout: 15_000 },
    );

    if (!updated) {
      return NextResponse.json(
        { error: INVALID_LINK_MESSAGE },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json(
      { error: "Unable to reset the password. Try again." },
      { status: 500 },
    );
  }
}
