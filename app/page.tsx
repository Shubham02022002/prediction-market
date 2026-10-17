"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MarketSummary = {
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

type Pagination = {
  page: number;
  limit: number;
  totalMarkets: number;
  totalPages: number;
};

const STATUS_OPTIONS = [
  { value: "", label: "All markets" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "VOID", label: "Void" },
];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  CLOSED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  RESOLVED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  VOID: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HomePage() {
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
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">
            AI news &amp; industry
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Forecast what happens next
          </h1>
          <p className="mt-3 max-w-xl text-sm text-slate-400">
            Take a YES or NO position on AI models, benchmarks, and industry
            events using virtual credits.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-400">
          Status
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60"
            />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
          <p className="text-lg font-medium text-slate-200">No markets here yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Try a different status filter, or check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => {
            const hasPool = market.pool.total > 0;

            return (
              <Link
                key={market.id}
                href={`/markets/${market.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-400/40 hover:bg-slate-900/80"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                    {market.category}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                      STATUS_STYLES[market.status] ??
                      "border-slate-600 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {market.status}
                  </span>
                </div>

                <h2 className="mt-4 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-100 group-hover:text-white">
                  {market.question}
                </h2>

                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-emerald-400">
                      YES {market.pool.yesPercentage.toFixed(0)}%
                    </span>
                    <span className="font-semibold text-rose-400">
                      NO {market.pool.noPercentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-800">
                    {hasPool ? (
                      <>
                        <div
                          className="bg-emerald-400"
                          style={{ width: `${market.pool.yesPercentage}%` }}
                        />
                        <div
                          className="bg-rose-400"
                          style={{ width: `${market.pool.noPercentage}%` }}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-slate-700" />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {hasPool
                        ? `${market.pool.total.toLocaleString()} cr pool`
                        : "No trading yet"}
                    </span>
                    <span>Closes {formatDate(market.closesAt)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(pagination.totalPages, current + 1))
            }
            disabled={page >= pagination.totalPages}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
