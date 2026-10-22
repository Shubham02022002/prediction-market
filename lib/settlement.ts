export type Outcome = "YES" | "NO";

export type RefundableBet = {
  id: string;
  userId: string;
  amount: number;
};

export type SettleableBet = RefundableBet & {
  outcome: Outcome;
};

export type LedgerPayout = {
  betId: string;
  userId: string;
  amount: number;
};

export type SettlementBreakdown = {
  totalPool: number;
  winningPool: number;
  losingPool: number;
  winnerCount: number;
  totalPayout: number;
  dust: number;
  payouts: LedgerPayout[];
};

export function computeSettlement(
  bets: SettleableBet[],
  outcome: Outcome,
): SettlementBreakdown {
  const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const winningBets = bets.filter((bet) => bet.outcome === outcome);
  const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
  const payouts: LedgerPayout[] = [];

  if (winningPool > 0) {
    for (const bet of winningBets) {
      const amount = Math.floor((bet.amount * totalPool) / winningPool);

      if (amount === 0) {
        continue;
      }

      payouts.push({ betId: bet.id, userId: bet.userId, amount });
    }
  }

  const totalPayout = payouts.reduce(
    (sum, payout) => sum + payout.amount,
    0,
  );

  return {
    totalPool,
    winningPool,
    losingPool: totalPool - winningPool,
    winnerCount: winningBets.length,
    totalPayout,
    dust: totalPool - totalPayout,
    payouts,
  };
}

export type RefundBreakdown = {
  betCount: number;
  totalRefund: number;
  refunds: LedgerPayout[];
};

export function computeRefunds(bets: RefundableBet[]): RefundBreakdown {
  const refunds = bets.map((bet) => ({
    betId: bet.id,
    userId: bet.userId,
    amount: bet.amount,
  }));

  return {
    betCount: refunds.length,
    totalRefund: refunds.reduce((sum, refund) => sum + refund.amount, 0),
    refunds,
  };
}
