"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  formatCredits,
  formatInitials,
  formatSignedCredits,
} from "@/lib/format";

type WindowOption = "all" | "30d" | "7d";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  net: number;
  volume: number;
  bets: number;
  wins: number;
};

type Viewer = {
  rank: number;
  net: number;
  volume: number;
  bets: number;
  wins: number;
};

type LeaderboardResponse = {
  window: WindowOption;
  entries: LeaderboardEntry[];
  viewer: Viewer | null;
  totalTraders: number;
};

const WINDOW_OPTIONS: { value: WindowOption; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "30 days" },
  { value: "7d", label: "7 days" },
];

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [window, setWindow] = useState<WindowOption>("all");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/leaderboard?window=${window}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load the leaderboard.");
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the leaderboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [window]);

  const entries = data?.entries ?? [];
  const viewer = data?.viewer ?? null;
  const viewerListed = viewer
    ? entries.some((entry) => entry.userId === session?.user?.id)
    : false;

  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            The ranking
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Leaderboard
            </h1>

            <dl className="flex gap-8 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <div>
                <dt>Traders</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink">
                  {data ? formatCredits(data.totalTraders) : "—"}
                </dd>
              </div>
              <div>
                <dt>Ranked by</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink">
                  Net profit
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-4 max-w-[58ch] text-sm leading-6 text-muted">
            Net profit is payouts minus stakes, measured in credits. Every trader
            starts from the same balance — the ranking only counts what they made
            or lost at the board.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
          <div className="flex flex-wrap gap-1">
            {WINDOW_OPTIONS.map((option) => {
              const isActive = window === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setWindow(option.value)}
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
            Updated when markets resolve
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

        {viewer && !viewerListed && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Your position · #{viewer.rank}
            </p>
            <p className="font-mono text-xs text-ink">
              <span
                className={
                  viewer.net > 0
                    ? "text-yes"
                    : viewer.net < 0
                      ? "text-no"
                      : "text-muted"
                }
              >
                {formatSignedCredits(viewer.net)} cr
              </span>
              <span className="ml-3 text-muted">
                {formatCredits(viewer.volume)} cr staked
              </span>
            </p>
          </div>
        )}

        {loading ? (
          <div aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[3rem_minmax(0,1fr)_6rem] items-center gap-4 border-b border-line py-5 sm:grid-cols-[3rem_minmax(0,1fr)_6rem_7rem_7rem]"
              >
                <div className="h-3 w-6 animate-pulse bg-line" />
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse bg-line" />
                  <div className="h-3 w-32 animate-pulse bg-line" />
                </div>
                <div className="h-3 w-12 animate-pulse bg-line" />
                <div className="hidden h-3 w-16 animate-pulse bg-line sm:block" />
                <div className="hidden h-3 w-14 animate-pulse bg-line sm:block" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="border-b border-line py-16">
            <p className="font-display text-2xl font-medium tracking-[-0.02em]">
              No ranked traders in this window.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Rankings appear once positions settle. Take a side and your name
              enters the board.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Trader leaderboard ranked by net profit
            </caption>
            <thead>
              <tr className="border-b border-line font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                <th scope="col" className="w-12 py-3 pr-2 text-left font-normal">
                  #
                </th>
                <th scope="col" className="py-3 pr-2 text-left font-normal">
                  Trader
                </th>
                <th
                  scope="col"
                  className="hidden w-28 py-3 text-right font-normal sm:table-cell"
                >
                  Trades
                </th>
                <th
                  scope="col"
                  className="hidden w-32 py-3 text-right font-normal sm:table-cell"
                >
                  Staked
                </th>
                <th scope="col" className="w-32 py-3 text-right font-normal">
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isViewer = entry.userId === session?.user?.id;
                const hitRate =
                  entry.bets > 0
                    ? Math.round((entry.wins / entry.bets) * 100)
                    : null;

                return (
                  <tr
                    key={entry.userId}
                    className={`border-b border-line ${
                      isViewer ? "bg-surface" : ""
                    }`}
                  >
                    <td className="py-4 pr-2 align-middle font-mono text-[11px] text-muted">
                      {String(entry.rank).padStart(2, "0")}
                    </td>
                    <td className="py-4 pr-2 align-middle">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-surface font-mono text-[10px] uppercase tracking-[0.04em] text-ink"
                        >
                          {formatInitials(entry.name)}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/traders/${entry.userId}`}
                            className="block truncate text-sm text-ink transition-colors hover:text-accent"
                          >
                            {entry.name}
                            {isViewer && (
                              <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                                You
                              </span>
                            )}
                          </Link>
                          <span className="mt-0.5 block font-mono text-[10px] text-muted">
                            {entry.wins} won · {entry.bets}{" "}
                            {entry.bets === 1 ? "bet" : "bets"}
                            {hitRate !== null ? ` · ${hitRate}%` : ""}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="hidden py-4 text-right align-middle font-mono text-xs text-ink sm:table-cell">
                      {formatCredits(entry.bets)}
                    </td>
                    <td className="hidden py-4 text-right align-middle font-mono text-xs text-muted sm:table-cell">
                      {formatCredits(entry.volume)} cr
                    </td>
                    <td
                      className={`py-4 text-right align-middle font-display text-lg font-semibold ${
                        entry.net > 0
                          ? "text-yes"
                          : entry.net < 0
                            ? "text-no"
                            : "text-muted"
                      }`}
                    >
                      {formatSignedCredits(entry.net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <p className="border-t border-line pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Rankings cover settled and open stakes. Unrealized positions count as
          losses until they payout.
        </p>
      </div>
    </main>
  );
}
