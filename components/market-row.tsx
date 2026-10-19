import Link from "next/link";
import { ProbabilityBar, StatusPill } from "@/components/market-ui";
import { formatCents, formatCredits, formatDate } from "@/lib/format";

export type MarketSummary = {
  id: string;
  slug: string;
  question: string;
  category: string;
  status: string;
  closesAt: string;
  createdAt: string;
  pool: {
    yes: number;
    no: number;
    total: number;
    yesPercentage: number;
    noPercentage: number;
  };
};

export function MarketRow({ market }: { market: MarketSummary }) {
  const hasPool = market.pool.total > 0;

  return (
    <Link
      href={`/markets/${market.slug}`}
      className="group grid gap-5 border-b border-line py-6 transition-colors sm:grid-cols-[minmax(0,1fr)_168px_124px] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusPill status={market.status} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {market.category}
          </span>
        </div>

        <h3 className="mt-3 max-w-[58ch] font-display text-[19px] font-medium leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
          {market.question}
        </h3>

        <div className="mt-3 flex items-center gap-3 sm:hidden">
          {hasPool ? (
            <ProbabilityBar yes={market.pool.yesPercentage} className="w-28" />
          ) : (
            <div className="h-1.5 w-28 bg-line" aria-hidden="true" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {hasPool
              ? `${formatCredits(market.pool.total)} cr pool`
              : "No trading yet"}
          </span>
        </div>
      </div>

      <div>
        <p
          className={`font-display text-2xl font-semibold leading-none ${
            hasPool ? "text-yes" : "text-muted"
          }`}
        >
          {hasPool ? `${Math.round(market.pool.yesPercentage)}%` : "—"}
        </p>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Yes {hasPool ? formatCents(market.pool.yesPercentage) : ""}
        </p>
        <div className="mt-2.5 hidden sm:block">
          {hasPool ? (
            <ProbabilityBar yes={market.pool.yesPercentage} />
          ) : (
            <div className="h-1.5 w-full bg-line" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
        <p className="font-mono text-xs text-ink">
          {hasPool ? `${formatCredits(market.pool.total)} cr` : "No pool"}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:mt-1">
          Pool
        </p>
        <p className="font-mono text-[10px] text-muted sm:mt-2">
          Closes {formatDate(market.closesAt)}
        </p>
      </div>
    </Link>
  );
}
