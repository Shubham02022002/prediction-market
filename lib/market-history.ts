export type HistoryPoint = {
  t: string;
  yes: number;
  no: number;
  total: number;
  yesPercentage: number;
};

type BetInput = {
  outcome: "YES" | "NO";
  amount: number;
  createdAt: Date | string;
};

export function buildHistory(bets: BetInput[]): HistoryPoint[] {
  let yes = 0;
  let no = 0;

  return bets.map((bet) => {
    if (bet.outcome === "YES") {
      yes += bet.amount;
    } else {
      no += bet.amount;
    }

    const total = yes + no;

    return {
      t: new Date(bet.createdAt).toISOString(),
      yes,
      no,
      total,
      yesPercentage: total === 0 ? 0 : (yes / total) * 100,
    };
  });
}

export function sampleHistory<T>(points: T[], max: number): T[] {
  if (points.length <= max) {
    return [...points];
  }

  const last = points.length - 1;
  const step = last / (max - 1);
  const sampled: T[] = [];

  for (let index = 0; index < max; index += 1) {
    sampled.push(points[Math.round(index * step)]);
  }

  return sampled;
}
