"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
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

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "closing", label: "Closing soon" },
  { value: "volume", label: "Highest volume" },
  { value: "movers", label: "Biggest movers" },
];

export default function MarketsPage() {
  const { status: sessionStatus } = useSession();
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [category, setCategory] = useState("");
  const [watchingOnly, setWatchingOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextQuery = query.trim();

    if (nextQuery === debouncedQuery) {
      return;
    }

    const handle = setTimeout(() => {
      setDebouncedQuery(nextQuery);
      setPage(1);
    }, 300);

    return () => clearTimeout(handle);
  }, [query, debouncedQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadMarkets() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "12",
          sort,
        });

        if (statusFilter) {
          params.set("status", statusFilter);
        }

        if (category) {
          params.set("category", category);
        }

        if (debouncedQuery) {
          params.set("q", debouncedQuery);
        }

        if (watchingOnly) {
          params.set("watching", "true");
        }

        const response = await fetch(`/api/markets?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load markets.");
        }

        if (!cancelled) {
          setMarkets(data.markets);
          setPagination(data.pagination);

          if (Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
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
  }, [page, statusFilter, category, debouncedQuery, sort, watchingOnly]);

  const hasFilters = Boolean(
    statusFilter || category || debouncedQuery || watchingOnly,
  );

  async function handleToggleWatch(market: MarketSummary) {
    const nextWatched = !market.watched;

    setMarkets((current) =>
      current.map((entry) =>
        entry.id === market.id ? { ...entry, watched: nextWatched } : entry,
      ),
    );

    try {
      const response = await fetch(`/api/watchlist/${market.slug}`, {
        method: nextWatched ? "POST" : "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to update watchlist.");
      }
    } catch {
      setMarkets((current) =>
        current.map((entry) =>
          entry.id === market.id ? { ...entry, watched: !nextWatched } : entry,
        ),
      );
      setError("Could not update your watchlist. Please try again.");
    }
  }

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
        <div className="border-b border-line py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              {sessionStatus === "authenticated" && (
                <button
                  type="button"
                  aria-pressed={watchingOnly}
                  onClick={() => {
                    setWatchingOnly((current) => !current);
                    setPage(1);
                  }}
                  className={`ml-2 flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    watchingOnly
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill={watchingOnly ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M6 4h12v17l-6-4-6 4V4z" strokeLinejoin="round" />
                  </svg>
                  Watching
                </button>
              )}
            </div>

            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {pagination
                ? `${formatCredits(pagination.totalMarkets)} ${pagination.totalMarkets === 1 ? "market" : "markets"}`
                : "—"}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-72">
              <label htmlFor="market-search" className="sr-only">
                Search markets
              </label>
              <input
                id="market-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions and categories"
                className="h-10 w-full border border-line bg-surface px-3 font-mono text-[11px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-ink"
              />
            </div>

            <div>
              <label htmlFor="market-sort" className="sr-only">
                Sort markets
              </label>
              <select
                id="market-sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className="h-10 border border-line bg-surface px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink outline-none transition-colors focus:border-ink"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {categories.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                Category
              </span>
              <button
                type="button"
                aria-pressed={category === ""}
                onClick={() => {
                  setCategory("");
                  setPage(1);
                }}
                className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  category === ""
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-muted hover:border-ink hover:text-ink"
                }`}
              >
                All
              </button>
              {categories.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  aria-pressed={category === entry}
                  onClick={() => {
                    setCategory(entry);
                    setPage(1);
                  }}
                  className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                    category === entry
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {entry}
                </button>
              ))}
            </div>
          )}
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
              {hasFilters
                ? "No markets match these filters."
                : "Nothing on the board here."}
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              {hasFilters
                ? "Try a different search, category, or status."
                : "New questions are listed regularly. Check back soon."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setCategory("");
                  setWatchingOnly(false);
                  setQuery("");
                  setDebouncedQuery("");
                  setPage(1);
                }}
                className="mt-6 border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {markets.map((market) => (
              <MarketRow
                key={market.id}
                market={market}
                onToggleWatch={
                  sessionStatus === "authenticated"
                    ? handleToggleWatch
                    : undefined
                }
              />
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
