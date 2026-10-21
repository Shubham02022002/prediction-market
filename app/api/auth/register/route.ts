import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { INITIAL_CREDITS } from "@/lib/credits";
import { rateLimit, rateLimitResponse, clientIp } from "@/lib/rate-limit";
import { userRegistrationSchema } from "@/lib/validations/user";

export async function POST(request: Request) {
  const limit = rateLimit(`register:${clientIp(request)}`, {
    limit: 5,
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
  const result = userRegistrationSchema.safeParse(requestBody);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { password, name } = result.data;
  const email = result.data.email.trim().toLowerCase();

  if (Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json(
      { error: "Password exceeds the maximum supported length" },
      { status: 400 },
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: name?.trim() || "New User",
        passwordHash,
        role: "USER",
        wallet: {
          create: { balance: INITIAL_CREDITS },
        },
        ledgerEntries: {
          create: {
            amount: INITIAL_CREDITS,
            type: "INITIAL_CREDIT",
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 },
    );
  }
}
