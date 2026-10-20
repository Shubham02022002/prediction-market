"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SideChip, StatusPill } from "@/components/market-ui";
import {
  formatCredits,
  formatDate,
  formatInitials,
  formatSignedCredits,
} from "@/lib/format";

type TraderStats = {
  net: number;
  volume: number;
  bets: number;
  wins: number;
  openPositions: number;
  rank: number | null;
};

type Trader = {
  id: string;
  name: string;
  image: string | null;
  memberSince: string;
  stats: TraderStats;
};

type Position = {
  id: string;
  outcome: "YES" | "NO";
  amount: number;
  createdAt: string;
  market: {
    slug: string;
    question: string;
    category: string;
    status: string;
    closesAt: string;
  };
};

type TraderResponse = {
  trader: Trader;
  positions: Position[];
};

export function TraderProfile({ id }: { id: string }) {
  const [data, setData] = useState<TraderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTrader() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/traders/${id}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load this trader.");
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this trader.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrader();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const trader = data?.trader;
  const positions = data?.positions ?? [];
  const winRate =
    trader && trader.stats.bets > 0
      ? Math.round((trader.stats.wins / trader.stats.bets) * 100)
      : null;

  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
          <Link
            href="/leaderboard"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
          >
            ← Leaderboard
          </Link>

          {loading ? (
            <div className="mt-8" aria-hidden="true">
              <div className="h-16 w-16 animate-pulse bg-line" />
              <div className="mt-5 h-12 w-72 animate-pulse bg-line" />
              <div className="mt-4 h-3 w-48 animate-pulse bg-line" />
            </div>
          ) : trader ? (
            <>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center border border-line bg-surface font-mono text-lg uppercase tracking-[0.04em] text-ink"
                >
                  {formatInitials(trader.name)}
                </span>

                <div>
                  <h1 className="max-w-full text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
                    {trader.name}
                  </h1>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    Member since {formatDate(trader.memberSince)}
                    {trader.stats.rank !== null
                      ? ` · Rank #${trader.stats.rank}`
                      : " · Unranked"}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-[56ch] text-sm leading-6 text-muted">
                A public record of every stake this trader has taken. Balances
                and account details stay private.
              </p>
            </>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {error && (
          <div
            role="alert"
            className="mt-6 border border-no/30 bg-no-soft px-4 py-4 text-sm text-no"
          >
            {error}
          </div>
        )}

        {loading ? (
          <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-surface p-5 sm:p-6">
                <div className="h-3 w-24 animate-pulse bg-line" />
                <div className="mt-4 h-9 w-20 animate-pulse bg-line" />
              </div>
            ))}
          </dl>
        ) : trader && !error ? (
          <>
            <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-surface p-5 sm:p-6">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Net profit
                </dt>
                <dd
                  className={`mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em] ${
                    trader.stats.net > 0
                      ? "text-yes"
                      : trader.stats.net < 0
                        ? "text-no"
                        : "text-ink"
                  }`}
                >
                  {formatSignedCredits(trader.stats.net)}
                </dd>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  Payouts minus stakes
                </p>
              </div>

              <div className="bg-surface p-5 sm:p-6">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Total staked
                </dt>
                <dd className="mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em]">
                  {formatCredits(trader.stats.volume)}
                </dd>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  Across {trader.stats.bets}{" "}
                  {trader.stats.bets === 1 ? "bet" : "bets"}
                </p>
              </div>

              <div className="bg-surface p-5 sm:p-6">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Record
                </dt>
                <dd className="mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em]">
                  {trader.stats.wins}
                  <span className="text-2xl text-muted">/{trader.stats.bets}</span>
                </dd>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  {winRate !== null ? `${winRate}% winning bets` : "No bets yet"}
                </p>
              </div>

              <div className="bg-surface p-5 sm:p-6">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Open positions
                </dt>
                <dd className="mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em]">
                  {trader.stats.openPositions}
                </dd>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  Markets still trading
                </p>
              </div>
            </dl>

            <section className="mt-12 pb-16">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-3">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Positions
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Latest {Math.min(positions.length, 20)}
                </span>
              </div>

              {positions.length === 0 ? (
                <div className="border-b border-line py-12">
                  <p className="font-display text-xl font-medium">
                    No public positions yet.
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                    When this trader takes a side, it shows up here.
                  </p>
                </div>
              ) : (
                <div>
                  {positions.map((position) => (
                    <Link
                      key={position.id}
                      href={`/markets/${position.market.slug}`}
                      className="group grid gap-3 border-b border-line py-5 sm:grid-cols-[minmax(0,1fr)_90px_140px_150px] sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status={position.market.status} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                            {position.market.category} · Closes{" "}
                            {formatDate(position.market.closesAt)}
                          </span>
                        </div>
                        <p className="mt-2 max-w-[56ch] font-display text-[17px] font-medium leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
                          {position.market.question}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 sm:contents">
                        <div>
                          <SideChip side={position.outcome} />
                        </div>
                        <p className="font-mono text-sm text-ink">
                          {formatCredits(position.amount)} cr
                        </p>
                      </div>

                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:text-right">
                        Placed {formatDate(position.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
