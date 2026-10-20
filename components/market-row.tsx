import Link from "next/link";
import { ProbabilityBar, StatusPill } from "@/components/market-ui";
import { ProbabilitySparkline } from "@/components/probability-chart";
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
  spark?: number[];
  watched?: boolean;
};

export function MarketRow({
  market,
  onToggleWatch,
}: {
  market: MarketSummary;
  onToggleWatch?: (market: MarketSummary) => void;
}) {
  const hasPool = market.pool.total > 0;

  return (
    <div className="group relative border-b border-line">
      <Link
        href={`/markets/${market.slug}`}
        className="grid gap-5 py-6 pr-10 transition-colors sm:grid-cols-[minmax(0,1fr)_168px_124px] sm:items-center sm:pr-12"
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
          {market.spark && market.spark.length >= 2 ? (
            <ProbabilitySparkline points={market.spark} className="h-8 w-full" />
          ) : hasPool ? (
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

      {onToggleWatch && (
        <button
          type="button"
          onClick={() => onToggleWatch(market)}
          aria-pressed={Boolean(market.watched)}
          aria-label={
            market.watched ? "Remove from watchlist" : "Add to watchlist"
          }
          title={market.watched ? "Remove from watchlist" : "Add to watchlist"}
          className={`absolute right-0 top-5 flex h-8 w-8 items-center justify-center border transition-colors ${
            market.watched
              ? "border-ink bg-ink text-paper"
              : "border-line bg-surface text-muted hover:border-ink hover:text-ink"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill={market.watched ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M6 4h12v17l-6-4-6 4V4z" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
