"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Wallet = {
  balance: number;
  updatedAt: string;
};

type Bet = {
  id: string;
  outcome: "YES" | "NO";
  amount: number;
  createdAt: string;
  market: {
    slug: string;
    question: string;
    status: string;
    closesAt: string;
  };
};

type LedgerEntry = {
  id: string;
  amount: number;
  type: string;
  createdAt: string;
  marketId: string | null;
  betId: string | null;
  market: { slug: string; question: string } | null;
};

const LEDGER_LABELS: Record<string, string> = {
  INITIAL_CREDIT: "Welcome credits",
  BET_STAKE: "Bet stake",
  BET_PAYOUT: "Payout",
  REFUND: "Refund",
  ADMIN_ADJUSTMENT: "Adjustment",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PortfolioPage() {
  const { status: sessionStatus } = useSession();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPortfolio() {
      setLoading(true);
      setError("");

      try {
        const [walletResponse, betsResponse, ledgerResponse] =
          await Promise.all([
            fetch("/api/wallet"),
            fetch("/api/bets/me?limit=50"),
            fetch("/api/wallet/ledger?limit=20"),
          ]);

        if (!walletResponse.ok || !betsResponse.ok || !ledgerResponse.ok) {
          throw new Error("Unable to load your portfolio.");
        }

        const walletData = await walletResponse.json();
        const betsData = await betsResponse.json();
        const ledgerData = await ledgerResponse.json();

        if (!cancelled) {
          setWallet(walletData.wallet);
          setBets(betsData.bets);
          setEntries(ledgerData.entries);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your portfolio.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  if (sessionStatus === "unauthenticated") {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Your portfolio</h1>
        <p className="mt-3 text-sm text-slate-400">
          Sign in to see your balance, bets, and credit history.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Your portfolio</h1>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Available credits
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {wallet ? wallet.balance.toLocaleString() : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total bets
          </p>
          <p className="mt-2 text-3xl font-bold">{loading ? "—" : bets.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Open positions
          </p>
          <p className="mt-2 text-3xl font-bold">
            {loading
              ? "—"
              : bets.filter((bet) => bet.market.status === "OPEN").length}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Your bets</h2>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl border border-slate-800 bg-slate-900"
              />
            ))}
          </div>
        ) : bets.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            No bets yet.{" "}
            <Link href="/" className="text-emerald-400 hover:text-emerald-300">
              Browse markets
            </Link>
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {bets.map((bet) => (
              <Link
                key={bet.id}
                href={`/markets/${bet.market.slug}`}
                className="flex flex-col gap-2 p-4 transition hover:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {bet.market.question}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {bet.market.status} · Closes{" "}
                    {formatDate(bet.market.closesAt)} · Placed{" "}
                    {formatDate(bet.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      bet.outcome === "YES"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {bet.outcome}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {bet.amount.toLocaleString()} cr
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Credit history</h2>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl border border-slate-800 bg-slate-900"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            No credit movements yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    {LEDGER_LABELS[entry.type] ?? entry.type}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {entry.market ? (
                      <Link
                        href={`/markets/${entry.market.slug}`}
                        className="hover:text-slate-300"
                      >
                        {entry.market.question}
                      </Link>
                    ) : (
                      "Account"
                    )}{" "}
                    · {formatDate(entry.createdAt)}
                  </p>
                </div>

                <span
                  className={`shrink-0 text-sm font-semibold ${
                    entry.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount.toLocaleString()} cr
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
