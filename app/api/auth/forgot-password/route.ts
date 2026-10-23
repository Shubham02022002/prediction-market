import { NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin } from "@/lib/app-url";
import { buildPasswordResetEmail, sendEmail } from "@/lib/email";
import { createResetToken, RESET_TOKEN_TTL_MS } from "@/lib/password-reset";
import prisma from "@/lib/prisma";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const requestSchema = z.object({
  email: z.email(),
});

const GENERIC_MESSAGE =
  "If an account exists for that email, a reset link is on its way.";

export async function POST(request: Request) {
  const ipLimit = rateLimit(`forgot:ip:${clientIp(request)}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  });

  if (!ipLimit.ok) {
    return rateLimitResponse(ipLimit.retryAfterSeconds);
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
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const email = result.data.email.trim().toLowerCase();

  const emailLimit = rateLimit(`forgot:email:${email}`, {
    limit: 3,
    windowMs: 60 * 60_000,
  });

  if (!emailLimit.ok) {
    return rateLimitResponse(emailLimit.retryAfterSeconds);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      const { token, tokenHash } = createResetToken();

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${appOrigin(request)}/reset-password?token=${encodeURIComponent(token)}`;

      try {
        await sendEmail({
          to: user.email,
          ...buildPasswordResetEmail({ name: user.name, resetUrl }),
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }
  } catch (error) {
    console.error("Password reset request failed:", error);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
