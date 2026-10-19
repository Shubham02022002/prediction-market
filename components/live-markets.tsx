"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketRow, type MarketSummary } from "@/components/market-row";
import { ProbabilityBar, StatusPill } from "@/components/market-ui";
import { formatCents, formatCredits, formatDate } from "@/lib/format";

function useOpenMarkets(limit: number) {
  const [markets, setMarkets] = useState<MarketSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMarkets() {
      try {
        const response = await fetch(
          `/api/markets?status=OPEN&limit=${limit}`,
        );
        if (!response.ok) {
          throw new Error("Unable to load markets.");
        }
        const data = await response.json();
        if (!cancelled) {
          setMarkets(data.markets);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }

    loadMarkets();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { markets, error };
}

export function FeaturedMarketTicket() {
  const { markets, error } = useOpenMarkets(4);
  const market = markets?.reduce<MarketSummary | undefined>(
    (best, candidate) =>
      !best || candidate.pool.total > best.pool.total ? candidate : best,
    undefined,
  );
  const hasPool = market ? market.pool.total > 0 : false;

  return (
    <aside className="border border-ink bg-ink p-5 text-paper sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-paper/15 pb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
          Featured market
        </span>
        {market && <StatusPill status={market.status} />}
      </div>

      {error ? (
        <div className="py-10">
          <p className="font-display text-xl font-medium">
            The board is quiet right now.
          </p>
          <p className="mt-2 text-sm leading-6 text-paper/60">
            Open markets will appear here as soon as they are listed.
          </p>
          <Link
            href="/markets"
            className="mt-5 inline-flex items-center gap-2 border border-paper/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-paper"
          >
            View the board <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : !market ? (
        <div className="space-y-4 py-6" aria-hidden="true">
          <div className="h-3 w-16 animate-pulse bg-paper/10" />
          <div className="h-6 w-full animate-pulse bg-paper/10" />
          <div className="h-6 w-3/4 animate-pulse bg-paper/10" />
          <div className="h-20 animate-pulse bg-paper/10" />
        </div>
      ) : (
        <>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
            {market.category}
          </p>
          <Link
            href={`/markets/${market.slug}`}
            className="mt-2 block font-display text-xl font-medium leading-snug tracking-[-0.01em] text-paper transition-colors hover:text-accent-soft"
          >
            {market.question}
          </Link>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">
                Yes
              </p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em] text-yes-soft">
                {hasPool ? `${Math.round(market.pool.yesPercentage)}%` : "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-paper/40">
                {hasPool ? formatCents(market.pool.yesPercentage) : "No pool"}
              </p>
            </div>
            <div className="border-l border-paper/15 pl-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">
                No
              </p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em] text-no-soft">
                {hasPool ? `${Math.round(market.pool.noPercentage)}%` : "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-paper/40">
                {hasPool ? formatCents(market.pool.noPercentage) : "No pool"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            {hasPool ? (
              <ProbabilityBar
                yes={market.pool.yesPercentage}
                className="h-2"
                trackClassName="bg-paper/15"
              />
            ) : (
              <div className="h-2 w-full bg-paper/15" aria-hidden="true" />
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-paper/15 pt-4">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
                Total pool
              </dt>
              <dd className="mt-1 font-mono text-sm text-paper">
                {hasPool ? `${formatCredits(market.pool.total)} cr` : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
                Closes
              </dt>
              <dd className="mt-1 font-mono text-sm text-paper">
                {formatDate(market.closesAt)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/markets/${market.slug}`}
            className="mt-6 flex items-center justify-between border border-paper/25 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-paper hover:bg-paper hover:text-ink"
          >
            <span>View market</span>
            <span aria-hidden="true">→</span>
          </Link>
        </>
      )}
    </aside>
  );
}

export function MarketBoard() {
  const { markets, error } = useOpenMarkets(4);

  if (error) {
    return (
      <div className="border-b border-line py-10">
        <p className="text-sm text-muted">
          The board could not load. Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (!markets) {
    return (
      <div aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b border-line py-6">
            <div className="h-3 w-24 animate-pulse bg-line" />
            <div className="mt-4 h-5 w-3/4 animate-pulse bg-line" />
            <div className="mt-4 h-1.5 w-40 animate-pulse bg-line" />
          </div>
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="border-b border-line py-12">
        <p className="font-display text-xl font-medium">No open markets yet.</p>
        <p className="mt-2 text-sm text-muted">
          New questions are listed regularly. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      {markets.map((market) => (
        <MarketRow key={market.id} market={market} />
      ))}
    </div>
  );
}
