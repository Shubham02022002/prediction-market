import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { INITIAL_CREDITS } from "../lib/credits";

const DEV_PASSWORD = "password123";

const userSeeds = [
  { email: "admin@example.com", name: "Market Admin", role: "ADMIN" as const },
  { email: "alice@example.com", name: "Alice", role: "USER" as const },
  { email: "bob@example.com", name: "Bob", role: "USER" as const },
  { email: "charlie@example.com", name: "Charlie", role: "USER" as const },
];

const marketSeeds = [
  {
    slug: "claude-next-model-2026",
    question:
      "Will Anthropic announce a new flagship Claude model before 2027?",
    description: "A sample market about Anthropic's next flagship model.",
    rules:
      "Resolve YES if an official announcement is made before the closing date.",
    category: "AI Models",
    status: "OPEN" as const,
    closesAt: new Date("2026-12-15T18:00:00Z"),
  },
  {
    slug: "openai-flagship-2026",
    question: "Will OpenAI announce another flagship model before 2027?",
    description: "Track official announcements from OpenAI.",
    rules:
      "Resolve YES only when OpenAI officially announces a new flagship model before closing.",
    category: "AI Models",
    status: "OPEN" as const,
    closesAt: new Date("2026-12-20T18:00:00Z"),
  },
  {
    slug: "coding-agent-benchmark-2026",
    question:
      "Will an AI coding agent exceed 80% on SWE-bench Verified by year-end 2026?",
    description: "A sample market about AI coding-agent benchmark performance.",
    rules:
      "Use a published benchmark result with a clearly identified agent and evaluation setup.",
    category: "AI Benchmarks",
    status: "OPEN" as const,
    closesAt: new Date("2026-12-31T18:00:00Z"),
  },
  {
    slug: "gpt5-release-september-2025",
    question: "Was GPT-5 released by September 30, 2025?",
    description: "A resolved historical market used to test resolution data.",
    rules: "Resolve YES if GPT-5 was publicly released by the stated date.",
    category: "AI Models",
    status: "RESOLVED" as const,
    closesAt: new Date("2025-09-30T18:00:00Z"),
  },
];

const betSeeds = [
  {
    email: "alice@example.com",
    slug: "claude-next-model-2026",
    outcome: "YES" as const,
    amount: 120,
    idempotencyKey: "seed-alice-claude-yes-v1",
  },
  {
    email: "bob@example.com",
    slug: "claude-next-model-2026",
    outcome: "NO" as const,
    amount: 80,
    idempotencyKey: "seed-bob-claude-no-v1",
  },
  {
    email: "charlie@example.com",
    slug: "claude-next-model-2026",
    outcome: "YES" as const,
    amount: 50,
    idempotencyKey: "seed-charlie-claude-yes-v1",
  },
  {
    email: "alice@example.com",
    slug: "openai-flagship-2026",
    outcome: "NO" as const,
    amount: 100,
    idempotencyKey: "seed-alice-openai-no-v1",
  },
  {
    email: "bob@example.com",
    slug: "openai-flagship-2026",
    outcome: "YES" as const,
    amount: 150,
    idempotencyKey: "seed-bob-openai-yes-v1",
  },
  {
    email: "charlie@example.com",
    slug: "coding-agent-benchmark-2026",
    outcome: "YES" as const,
    amount: 75,
    idempotencyKey: "seed-charlie-benchmark-yes-v1",
  },
];

async function main() {
  const devPasswordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  await prisma.$transaction(
    async (tx) => {
      const users = new Map<string, { id: string }>();

      // 1. Create users and initialize wallets only when missing.
      for (const seed of userSeeds) {
        let user = await tx.user.findUnique({
          where: { email: seed.email },
          select: { id: true, passwordHash: true },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              email: seed.email,
              name: seed.name,
              role: seed.role,
              passwordHash: devPasswordHash,
            },
            select: { id: true, passwordHash: true },
          });
        } else if (!user.passwordHash) {
          await tx.user.update({
            where: { id: user.id },
            data: { passwordHash: devPasswordHash },
          });
        }

        users.set(seed.email, user);

        const wallet = await tx.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          await tx.wallet.create({
            data: {
              userId: user.id,
              balance: INITIAL_CREDITS,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              userId: user.id,
              amount: INITIAL_CREDITS,
              type: "INITIAL_CREDIT",
            },
          });
        }
      }

      const admin = users.get("admin@example.com");

      if (!admin) {
        throw new Error("Seed admin was not created");
      }

      // 2. Create markets without duplicating existing slugs.
      const markets = new Map<string, { id: string }>();

      for (const seed of marketSeeds) {
        const market = await tx.market.upsert({
          where: { slug: seed.slug },
          create: seed,
          update: {},
          select: { id: true },
        });

        markets.set(seed.slug, market);

        // 3. Create an audit event once per seeded market.
        const auditEvent = await tx.auditEvent.findFirst({
          where: {
            marketId: market.id,
            userId: admin.id,
            action: "MARKET_SEEDED",
          },
          select: { id: true },
        });

        if (!auditEvent) {
          await tx.auditEvent.create({
            data: {
              userId: admin.id,
              marketId: market.id,
              action: "MARKET_SEEDED",
              details: { source: "development-seed" },
            },
          });
        }
      }

      // 4. Add a sample resolution for the historical market.
      const resolvedMarket = markets.get("gpt5-release-september-2025");

      if (!resolvedMarket) {
        throw new Error("Resolved market was not created");
      }

      await tx.marketResolution.upsert({
        where: { marketId: resolvedMarket.id },
        create: {
          marketId: resolvedMarket.id,
          outcome: "YES",
          resolvedBy: admin.id,
          notes: "Development fixture for testing resolved markets.",
          evidenceUrl: "https://openai.com/",
        },
        update: {},
      });

      // 5. Create bets, deduct stakes, and record ledger entries.
      for (const seed of betSeeds) {
        const user = users.get(seed.email);
        const market = markets.get(seed.slug);

        if (!user || !market) {
          throw new Error(`Missing user or market for ${seed.idempotencyKey}`);
        }

        const existingBet = await tx.bet.findUnique({
          where: {
            userId_idempotencyKey: {
              userId: user.id,
              idempotencyKey: seed.idempotencyKey,
            },
          },
          select: { id: true },
        });

        // Makes subsequent seed runs skip existing bets.
        if (existingBet) continue;

        const wallet = await tx.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet || wallet.balance < seed.amount) {
          throw new Error(`Insufficient wallet balance for ${seed.email}`);
        }

        const bet = await tx.bet.create({
          data: {
            userId: user.id,
            marketId: market.id,
            outcome: seed.outcome,
            amount: seed.amount,
            idempotencyKey: seed.idempotencyKey,
          },
        });

        await tx.wallet.update({
          where: { userId: user.id },
          data: { balance: { decrement: seed.amount } },
        });

        await tx.ledgerEntry.create({
          data: {
            userId: user.id,
            marketId: market.id,
            betId: bet.id,
            type: "BET_STAKE",
            amount: -seed.amount,
          },
        });
      }
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );

  console.log("Development seed completed successfully.");
  console.log(`Seed accounts use password: ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Development seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
