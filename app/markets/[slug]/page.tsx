"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useState } from "react";

type MarketDetail = {
  id: string;
  slug: string;
  question: string;
  description: string | null;
  rules: string | null;
  category: string;
  status: string;
  closesAt: string;
  createdAt: string;
  resolution: {
    outcome: "YES" | "NO";
    notes: string | null;
    evidenceUrl: string | null;
    resolvedAt: string;
  } | null;
};

type Pool = {
  yes: number;
  no: number;
  total: number;
  yesPercentage: number;
  noPercentage: number;
};

type Outcome = "YES" | "NO";

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

function MarketSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
      <div className="mt-6 h-24 animate-pulse rounded-2xl bg-slate-900" />
      <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-900" />
    </main>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={<MarketSkeleton />}>
      <MarketPageContent />
    </Suspense>
  );
}

function MarketPageContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { status: sessionStatus } = useSession();

  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [outcome, setOutcome] = useState<Outcome>("YES");
  const [amount, setAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadMarket = useCallback(async () => {
    try {
      const response = await fetch(`/api/markets/${slug}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load market.");
      }

      setMarket(data.market);
      setPool(data.pool);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load market.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setWalletBalance(null);
      return;
    }

    let cancelled = false;

    async function loadWallet() {
      try {
        const response = await fetch("/api/wallet");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setWalletBalance(data.wallet.balance);
        }
      } catch {
        // Balance is displayed opportunistically; the bet endpoint enforces it.
      }
    }

    loadWallet();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  if (loading) {
    return <MarketSkeleton />;
  }

  if (loadError || !market || !pool) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          {loadError || "Market not found."}
        </div>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          ← Back to markets
        </Link>
      </main>
    );
  }

  const hasPool = pool.total > 0;
  const isPastClose = new Date(market.closesAt) <= new Date();
  const canTrade =
    sessionStatus === "authenticated" &&
    market.status === "OPEN" &&
    !isPastClose;

  const numericAmount = Number(amount);
  const validAmount =
    Number.isInteger(numericAmount) && numericAmount > 0;

  const winningPool = outcome === "YES" ? pool.yes : pool.no;
  const projectedPool = pool.total + (validAmount ? numericAmount : 0);
  const projectedWinningPool = winningPool + (validAmount ? numericAmount : 0);
  const estimatedPayout =
    validAmount && projectedWinningPool > 0
      ? Math.floor((numericAmount * projectedPool) / projectedWinningPool)
      : null;

  async function handleBet() {
    setFormError("");
    setSuccessMessage("");

    if (!validAmount) {
      setFormError("Enter a positive whole number of credits.");
      return;
    }

    if (walletBalance !== null && numericAmount > walletBalance) {
      setFormError("You do not have enough credits for this bet.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/markets/${market!.slug}/bets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          amount: numericAmount,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setFormError(data?.error ?? "Unable to place bet.");
        return;
      }

      if (typeof data?.balance === "number") {
        setWalletBalance(data.balance);
      }

      window.dispatchEvent(new Event("wallet:updated"));
      setSuccessMessage(`Bet placed: ${numericAmount} credits on ${outcome}.`);
      setAmount("");
      await loadMarket();
    } catch {
      setFormError("Unable to place bet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-sm font-medium text-slate-400 transition hover:text-slate-200"
      >
        ← All markets
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
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
        <span className="text-xs text-slate-500">
          Closes {formatDate(market.closesAt)}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        {market.question}
      </h1>

      {market.description && (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {market.description}
        </p>
      )}

      {market.status === "RESOLVED" && market.resolution && (
        <div className="mt-6 rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-200">
          Resolved <strong>{market.resolution.outcome}</strong> on{" "}
          {formatDate(market.resolution.resolvedAt)}.
          {market.resolution.notes && (
            <span className="mt-1 block text-sky-300/80">
              {market.resolution.notes}
            </span>
          )}
          {market.resolution.evidenceUrl && (
            <a
              href={market.resolution.evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block underline underline-offset-2"
            >
              View evidence
            </a>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Resolution rules
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
            {market.rules ?? "No resolution rules were provided for this market."}
          </p>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-emerald-400">
                YES {pool.yesPercentage.toFixed(1)}%
              </span>
              <span className="font-semibold text-rose-400">
                NO {pool.noPercentage.toFixed(1)}%
              </span>
            </div>

            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-800">
              {hasPool ? (
                <>
                  <div
                    className="bg-emerald-400"
                    style={{ width: `${pool.yesPercentage}%` }}
                  />
                  <div
                    className="bg-rose-400"
                    style={{ width: `${pool.noPercentage}%` }}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-700" />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{pool.yes.toLocaleString()} cr on YES</span>
              <span>{pool.total.toLocaleString()} cr total pool</span>
              <span>{pool.no.toLocaleString()} cr on NO</span>
            </div>
          </div>
        </section>

        <section className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Take a position</h2>
            {walletBalance !== null && (
              <span className="text-xs text-slate-500">
                Balance {walletBalance.toLocaleString()} cr
              </span>
            )}
          </div>

          {sessionStatus === "unauthenticated" ? (
            <div className="mt-5">
              <p className="text-sm text-slate-400">
                Sign in to place a bet with virtual credits.
              </p>
              <Link
                href="/login"
                className="mt-4 block rounded-lg bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Sign in
              </Link>
            </div>
          ) : !canTrade ? (
            <p className="mt-5 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
              {market.status !== "OPEN" || isPastClose
                ? "Trading is closed for this market."
                : "Checking your session…"}
            </p>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutcome("YES")}
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                    outcome === "YES"
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : "border-slate-700 bg-slate-950 text-emerald-300 hover:border-emerald-400/50"
                  }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome("NO")}
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                    outcome === "NO"
                      ? "border-rose-400 bg-rose-400 text-slate-950"
                      : "border-slate-700 bg-slate-950 text-rose-300 hover:border-rose-400/50"
                  }`}
                >
                  NO
                </button>
              </div>

              <label
                htmlFor="amount"
                className="mt-5 block text-sm font-medium text-slate-300"
              >
                Credits to stake
              </label>
              <input
                id="amount"
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="100"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />

              <div className="mt-2 flex gap-2">
                {[10, 50, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                  >
                    {value}
                  </button>
                ))}
                {walletBalance !== null && walletBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(walletBalance))}
                    className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                  >
                    Max
                  </button>
                )}
              </div>

              {estimatedPayout !== null && (
                <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-400">
                  Estimated payout if {outcome} wins:{" "}
                  <span className="font-semibold text-slate-200">
                    {estimatedPayout.toLocaleString()} cr
                  </span>
                  . Pooled payout is final only after the market closes.
                </p>
              )}

              {formError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {formError}
                </p>
              )}

              {successMessage && (
                <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                  {successMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleBet}
                disabled={submitting || !validAmount}
                className={`mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  outcome === "YES"
                    ? "bg-emerald-400 hover:bg-emerald-300"
                    : "bg-rose-400 hover:bg-rose-300"
                }`}
              >
                {submitting
                  ? "Placing bet…"
                  : validAmount
                    ? `Bet ${numericAmount.toLocaleString()} cr on ${outcome}`
                    : `Bet on ${outcome}`}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
