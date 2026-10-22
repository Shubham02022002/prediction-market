import { describe, expect, it } from "bun:test";
import {
  computeRefunds,
  computeSettlement,
  type Outcome,
  type SettleableBet,
} from "./settlement";

function bet(
  id: string,
  amount: number,
  outcome: Outcome,
  userId = id,
): SettleableBet {
  return { id, userId, outcome, amount };
}

describe("computeSettlement", () => {
  it("splits the full pool pro-rata between winners", () => {
    const bets = [
      bet("alice", 60, "YES"),
      bet("bob", 40, "YES"),
      bet("charlie", 100, "NO"),
    ];

    const result = computeSettlement(bets, "YES");

    expect(result.totalPool).toBe(200);
    expect(result.winningPool).toBe(100);
    expect(result.losingPool).toBe(100);
    expect(result.winnerCount).toBe(2);
    expect(result.payouts).toEqual([
      { betId: "alice", userId: "alice", amount: 120 },
      { betId: "bob", userId: "bob", amount: 80 },
    ]);
    expect(result.totalPayout).toBe(200);
    expect(result.dust).toBe(0);
  });

  it("floors fractional payouts and reports the dust", () => {
    const bets = [
      bet("a", 10, "YES"),
      bet("b", 10, "YES"),
      bet("c", 10, "YES"),
      bet("d", 70, "NO"),
    ];

    const result = computeSettlement(bets, "YES");

    expect(result.winningPool).toBe(30);
    expect(result.payouts.map((payout) => payout.amount)).toEqual([33, 33, 33]);
    expect(result.totalPayout).toBe(99);
    expect(result.dust).toBe(1);
  });

  it("pays nothing when the winning side has no stakes", () => {
    const bets = [bet("a", 50, "NO"), bet("b", 25, "NO")];

    const result = computeSettlement(bets, "YES");

    expect(result.payouts).toEqual([]);
    expect(result.totalPayout).toBe(0);
    expect(result.winnerCount).toBe(0);
    expect(result.dust).toBe(75);
  });

  it("lets a lone winner take the whole pool", () => {
    const bets = [bet("a", 40, "YES"), bet("b", 60, "NO")];

    const result = computeSettlement(bets, "YES");

    expect(result.payouts).toEqual([
      { betId: "a", userId: "a", amount: 100 },
    ]);
    expect(result.dust).toBe(0);
  });

  it("aggregates multiple bets from the same user as separate payouts", () => {
    const bets = [bet("a1", 30, "YES", "alice"), bet("a2", 30, "YES", "alice")];

    const result = computeSettlement(bets, "YES");

    expect(result.payouts).toEqual([
      { betId: "a1", userId: "alice", amount: 30 },
      { betId: "a2", userId: "alice", amount: 30 },
    ]);
  });

  it("conserves credits: payouts plus dust equal the pool", () => {
    const scenarios: SettleableBet[][] = [
      [bet("a", 1, "YES"), bet("b", 1, "YES"), bet("c", 1, "NO")],
      [bet("a", 7, "YES"), bet("b", 13, "YES"), bet("c", 29, "NO")],
      [
        bet("a", 3, "YES"),
        bet("b", 3, "NO"),
        bet("c", 4, "YES"),
        bet("d", 10, "NO"),
      ],
    ];

    for (const bets of scenarios) {
      for (const outcome of ["YES", "NO"] as const) {
        const result = computeSettlement(bets, outcome);
        expect(result.totalPayout + result.dust).toBe(result.totalPool);
      }
    }
  });

  it("returns an empty breakdown when no bets were placed", () => {
    const result = computeSettlement([], "NO");

    expect(result).toEqual({
      totalPool: 0,
      winningPool: 0,
      losingPool: 0,
      winnerCount: 0,
      totalPayout: 0,
      dust: 0,
      payouts: [],
    });
  });
});

describe("computeRefunds", () => {
  it("refunds every stake in full", () => {
    const bets = [bet("a", 25, "YES"), bet("b", 75, "NO")];

    const result = computeRefunds(bets);

    expect(result.betCount).toBe(2);
    expect(result.totalRefund).toBe(100);
    expect(result.refunds).toEqual([
      { betId: "a", userId: "a", amount: 25 },
      { betId: "b", userId: "b", amount: 75 },
    ]);
  });

  it("returns zeroes when there is nothing to refund", () => {
    expect(computeRefunds([])).toEqual({
      betCount: 0,
      totalRefund: 0,
      refunds: [],
    });
  });
});
