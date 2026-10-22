"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { MarketRow, type MarketSummary } from "@/components/market-row";
import { formatCredits } from "@/lib/format";

const LIMIT = 50;

export default function WatchlistPage() {
  const { status: sessionStatus } = useSession();
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [totalMarkets, setTotalMarkets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        watching: "true",
        sort: "closing",
        limit: String(LIMIT),
      });
      const response = await fetch(`/api/markets?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load your watchlist.");
      }

      setMarkets(data.markets);
      setTotalMarkets(data.pagination?.totalMarkets ?? data.markets.length);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your watchlist.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      setLoading(false);
      return;
    }

    loadWatchlist();
  }, [sessionStatus, loadWatchlist]);

  async function handleToggleWatch(market: MarketSummary) {
    const previous = markets;
    setMarkets((current) => current.filter((entry) => entry.id !== market.id));
    setTotalMarkets((current) => Math.max(0, current - 1));

    try {
      const response = await fetch(`/api/watchlist/${market.slug}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to update watchlist.");
      }
    } catch {
      setMarkets(previous);
      setTotalMarkets((current) => current + 1);
      setError("Could not update your watchlist. Please try again.");
    }
  }

  const viewStatus = mounted ? sessionStatus : "loading";

  if (viewStatus === "unauthenticated") {
    return (
      <main>
        <section className="border-b border-line">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              Account
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Watchlist
            </h1>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-xl border border-line bg-surface p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Sign in required
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">
              Track the questions you care about.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Save markets to your watchlist and we will notify you when they
              resolve or are voided.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="border border-line-strong px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const openCount = markets.filter((market) => market.status === "OPEN").length;

  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Account
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
                Watchlist
              </h1>
              <p className="mt-3 max-w-[54ch] text-sm leading-6 text-muted">
                Markets you are tracking. Closing soon appears first.
              </p>
            </div>

            <dl className="flex gap-8 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <div>
                <dt>Tracked</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink">
                  {loading ? "—" : formatCredits(totalMarkets)}
                </dd>
              </div>
              <div>
                <dt>Open</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink">
                  {loading ? "—" : formatCredits(openCount)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {error && (
          <div
            role="alert"
            className="border-b border-no/30 bg-no-soft px-4 py-4 text-sm text-no"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="border-b border-line py-6 sm:grid sm:grid-cols-[minmax(0,1fr)_168px_124px] sm:items-center"
              >
                <div>
                  <div className="h-3 w-28 animate-pulse bg-line" />
                  <div className="mt-4 h-5 w-3/4 animate-pulse bg-line" />
                  <div className="mt-4 h-1.5 w-36 animate-pulse bg-line" />
                </div>
                <div className="mt-4 h-7 w-16 animate-pulse bg-line sm:mt-0" />
                <div className="mt-3 h-3 w-20 animate-pulse bg-line sm:mt-0" />
              </div>
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="border-b border-line py-16">
            <p className="font-display text-2xl font-medium tracking-[-0.02em]">
              Your watchlist is empty.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Open any market and press the bookmark to keep an eye on it here.
            </p>
            <Link
              href="/markets"
              className="mt-6 inline-block border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
            >
              Browse markets
            </Link>
          </div>
        ) : (
          <div>
            {markets.map((market) => (
              <MarketRow
                key={market.id}
                market={market}
                onToggleWatch={handleToggleWatch}
              />
            ))}
          </div>
        )}

        {!loading && totalMarkets > markets.length && (
          <p className="border-b border-line py-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            Showing {formatCredits(markets.length)} of{" "}
            {formatCredits(totalMarkets)} watched markets. Remove a market to see
            the rest.
          </p>
        )}

        <div className="py-8">
          <Link
            href="/markets"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
          >
            ← Back to the board
          </Link>
        </div>
      </section>
    </main>
  );
}
