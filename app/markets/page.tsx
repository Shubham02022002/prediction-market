"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketRow, type MarketSummary } from "@/components/market-row";
import { formatCredits } from "@/lib/format";

type Pagination = {
  page: number;
  limit: number;
  totalMarkets: number;
  totalPages: number;
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "VOID", label: "Void" },
];

export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMarkets() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "12",
        });

        if (statusFilter) {
          params.set("status", statusFilter);
        }

        const response = await fetch(`/api/markets?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load markets.");
        }

        if (!cancelled) {
          setMarkets(data.markets);
          setPagination(data.pagination);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load markets.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMarkets();

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter]);

  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            The board
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Markets
            </h1>

            <dl className="flex gap-8 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <div>
                <dt>Listed</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink">
                  {pagination ? formatCredits(pagination.totalMarkets) : "—"}
                </dd>
              </div>
              <div>
                <dt>Pricing</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink">
                  Pool share
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-4 max-w-[54ch] text-sm leading-6 text-muted">
            Every question publishes its resolution rules before trading opens.
            Take a side, and let the pool decide the price.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4">
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((option) => {
              const isActive = statusFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setStatusFilter(option.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    isActive
                      ? "bg-ink text-paper"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            Newest first
          </p>
        </div>

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
            {Array.from({ length: 6 }).map((_, index) => (
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
              Nothing on the board here.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Try a different status, or head back to the full board.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setPage(1);
              }}
              className="mt-6 border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
            >
              Show all markets
            </button>
          </div>
        ) : (
          <div>
            {markets.map((market) => (
              <MarketRow key={market.id} market={market} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 py-8">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
            >
              ← Previous
            </button>

            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1),
                )
              }
              disabled={page >= pagination.totalPages}
              className="border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
            >
              Next →
            </button>
          </div>
        )}
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <p className="border-t border-line pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Pools are virtual. Payouts are proportional to stake.
        </p>
        <Link
          href="/portfolio"
          className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
        >
          Review your positions →
        </Link>
      </div>
    </main>
  );
}
