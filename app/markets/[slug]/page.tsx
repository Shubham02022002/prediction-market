"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ProbabilityBar, StatusPill } from "@/components/market-ui";
import { MarketDiscussion } from "@/components/market-discussion";
import { ProbabilityChart } from "@/components/probability-chart";
import type { HistoryPoint } from "@/lib/market-history";
import {
  formatCents,
  formatCredits,
  formatDate,
} from "@/lib/format";

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
  watched?: boolean;
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

function MarketSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <div className="h-3 w-24 animate-pulse bg-line" />
      <div className="mt-8 h-4 w-40 animate-pulse bg-line" />
      <div className="mt-4 h-12 w-3/4 animate-pulse bg-line" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="h-64 animate-pulse border border-line bg-surface" />
        <div className="h-96 animate-pulse border border-line bg-surface" />
      </div>
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
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [outcome, setOutcome] = useState<Outcome>("YES");
  const [amount, setAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [watched, setWatched] = useState(false);
  const [watchPending, setWatchPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadMarket = useCallback(async () => {
    try {
      const [response, historyResponse] = await Promise.all([
        fetch(`/api/markets/${slug}`),
        fetch(`/api/markets/${slug}/history`).catch(() => null),
      ]);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load market.");
      }

      setMarket(data.market);
      setPool(data.pool);
      setWatched(Boolean(data.market.watched));

      if (historyResponse?.ok) {
        const historyData = await historyResponse.json().catch(() => null);
        setHistory(
          Array.isArray(historyData?.history) ? historyData.history : [],
        );
      } else {
        setHistory([]);
      }
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
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="border border-no/30 bg-no-soft p-6 text-sm text-no">
          {loadError || "Market not found."}
        </div>
        <Link
          href="/markets"
          className="mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
        >
          ← Back to the board
        </Link>
      </main>
    );
  }

  const hasPool = pool.total > 0;
  const viewStatus = mounted ? sessionStatus : "loading";
  const isPastClose = new Date(market.closesAt) <= new Date();
  const canTrade =
    viewStatus === "authenticated" &&
    market.status === "OPEN" &&
    !isPastClose;

  const numericAmount = Number(amount);
  const validAmount = Number.isInteger(numericAmount) && numericAmount > 0;

  const winningPool = outcome === "YES" ? pool.yes : pool.no;
  const projectedPool = pool.total + (validAmount ? numericAmount : 0);
  const projectedWinningPool = winningPool + (validAmount ? numericAmount : 0);
  const estimatedPayout =
    validAmount && projectedWinningPool > 0
      ? Math.floor((numericAmount * projectedPool) / projectedWinningPool)
      : null;

  const yesMultiplier = pool.yes > 0 ? (pool.total / pool.yes).toFixed(1) : null;
  const noMultiplier = pool.no > 0 ? (pool.total / pool.no).toFixed(1) : null;

  async function handleToggleWatch() {
    if (watchPending) {
      return;
    }

    const nextWatched = !watched;
    setWatched(nextWatched);
    setWatchPending(true);

    try {
      const response = await fetch(`/api/watchlist/${market!.slug}`, {
        method: nextWatched ? "POST" : "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to update watchlist.");
      }
    } catch {
      setWatched(!nextWatched);
    } finally {
      setWatchPending(false);
    }
  }

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
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <Link
        href="/markets"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
      >
        ← The board
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusPill status={market.status} />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {market.category}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Closes {formatDate(market.closesAt)}
        </span>
        {viewStatus === "authenticated" && (
          <button
            type="button"
            onClick={handleToggleWatch}
            disabled={watchPending}
            aria-pressed={watched}
            className={`ml-auto flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
              watched
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill={watched ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M6 4h12v17l-6-4-6 4V4z" strokeLinejoin="round" />
            </svg>
            {watched ? "Watching" : "Watch"}
          </button>
        )}
      </div>

      <h1 className="mt-5 max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
        {market.question}
      </h1>

      {market.description && (
        <p className="mt-5 max-w-[60ch] text-sm leading-7 text-muted">
          {market.description}
        </p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <section className="border border-line bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-7">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Market probability
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {hasPool ? `${formatCredits(pool.total)} cr pooled` : "Awaiting first trade"}
              </span>
            </div>

            <div className="grid grid-cols-2">
              <div className="p-5 sm:p-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-yes">
                  Yes
                </p>
                <p className="mt-2 font-display text-5xl font-semibold leading-none tracking-[-0.04em] text-yes">
                  {hasPool ? `${Math.round(pool.yesPercentage)}%` : "—"}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {hasPool ? formatCents(pool.yesPercentage) : "No price yet"} ·{" "}
                  {formatCredits(pool.yes)} cr
                </p>
              </div>

              <div className="border-l border-line p-5 sm:p-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-no">
                  No
                </p>
                <p className="mt-2 font-display text-5xl font-semibold leading-none tracking-[-0.04em] text-no">
                  {hasPool ? `${Math.round(pool.noPercentage)}%` : "—"}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {hasPool ? formatCents(pool.noPercentage) : "No price yet"} ·{" "}
                  {formatCredits(pool.no)} cr
                </p>
              </div>
            </div>

            {history.length >= 2 && <ProbabilityChart points={history} />}

            <div className="border-t border-line px-5 py-5 sm:px-7">
              {hasPool ? (
                <ProbabilityBar yes={pool.yesPercentage} className="h-2" />
              ) : (
                <div className="h-2 w-full bg-line" aria-hidden="true" />
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                <span>{formatCredits(pool.yes)} cr on yes</span>
                <span>{formatCredits(pool.total)} cr total pool</span>
                <span>{formatCredits(pool.no)} cr on no</span>
              </div>
            </div>
          </section>

          {market.status === "RESOLVED" && market.resolution && (
            <section className="border border-accent/30 bg-accent-soft p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                  Resolution
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent/70">
                  {formatDate(market.resolution.resolvedAt)}
                </p>
              </div>

              <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">
                Resolved{" "}
                <span
                  className={
                    market.resolution.outcome === "YES"
                      ? "text-yes"
                      : "text-no"
                  }
                >
                  {market.resolution.outcome}
                </span>
                .
              </p>

              {market.resolution.notes && (
                <p className="mt-2 max-w-[58ch] text-sm leading-6 text-ink/75">
                  {market.resolution.notes}
                </p>
              )}

              {market.resolution.evidenceUrl && (
                <a
                  href={market.resolution.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-accent underline underline-offset-4"
                >
                  View evidence ↗
                </a>
              )}
            </section>
          )}

          {market.status === "VOID" && (
            <section className="border border-line-strong bg-surface p-5 sm:p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Voided
              </p>
              <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">
                This market was voided.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Every stake was returned to its trader. No side was paid out.
              </p>
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-3">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                Resolution rules
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Published before open
              </span>
            </div>

            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-ink/75">
              {market.rules ??
                "No resolution rules were provided for this market."}
            </p>
          </section>

          <dl className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
            <div className="bg-surface p-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Category
              </dt>
              <dd className="mt-1.5 text-sm text-ink">{market.category}</dd>
            </div>
            <div className="bg-surface p-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Closes
              </dt>
              <dd className="mt-1.5 text-sm text-ink">
                {formatDate(market.closesAt)}
              </dd>
            </div>
            <div className="bg-surface p-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Settlement
              </dt>
              <dd className="mt-1.5 text-sm text-ink">
                {market.status === "RESOLVED" && market.resolution
                  ? market.resolution.outcome
                  : market.status === "VOID"
                    ? "Refunded"
                    : "Pending"}
              </dd>
            </div>
          </dl>

          <div className="mt-12">
            <MarketDiscussion slug={market.slug} />
          </div>
        </div>

        <aside className="border border-ink bg-surface lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">
              Take a position
            </h2>
            {walletBalance !== null && (
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Bal {formatCredits(walletBalance)} cr
              </span>
            )}
          </div>

          <div className="p-5">
            {viewStatus === "unauthenticated" ? (
              <div>
                <p className="text-sm leading-6 text-muted">
                  Sign in to take a side with virtual credits.
                </p>
                <Link
                  href="/login"
                  className="mt-5 flex items-center justify-center bg-ink px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85"
                >
                  Sign in to trade
                </Link>
                <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  1,000 credits on signup
                </p>
              </div>
            ) : !canTrade ? (
              <div className="border border-line bg-paper p-4">
                <p className="text-sm leading-6 text-ink">
                  {market.status === "RESOLVED" && market.resolution
                    ? `Trading is closed. This market resolved ${market.resolution.outcome}.`
                    : market.status === "VOID"
                      ? "Trading is closed. All stakes were refunded."
                      : "Trading is closed for this market."}
                </p>
                <Link
                  href="/portfolio"
                  className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-muted underline underline-offset-4 hover:text-ink"
                >
                  View your portfolio
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={outcome === "YES"}
                    onClick={() => setOutcome("YES")}
                    className={`border px-4 py-3 text-left transition-colors ${
                      outcome === "YES"
                        ? "border-yes bg-yes text-white"
                        : "border-line bg-paper text-yes hover:border-yes/50"
                    }`}
                  >
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
                      Buy yes
                    </span>
                    <span className="mt-1 block font-display text-2xl font-semibold leading-none">
                      {hasPool ? formatCents(pool.yesPercentage) : "—"}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={outcome === "NO"}
                    onClick={() => setOutcome("NO")}
                    className={`border px-4 py-3 text-left transition-colors ${
                      outcome === "NO"
                        ? "border-no bg-no text-white"
                        : "border-line bg-paper text-no hover:border-no/50"
                    }`}
                  >
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
                      Buy no
                    </span>
                    <span className="mt-1 block font-display text-2xl font-semibold leading-none">
                      {hasPool ? formatCents(pool.noPercentage) : "—"}
                    </span>
                  </button>
                </div>

                <label
                  htmlFor="amount"
                  className="mt-5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
                >
                  Credits to stake
                </label>

                <div className="relative mt-2">
                  <input
                    id="amount"
                    type="number"
                    min={1}
                    step={1}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="100"
                    className="h-12 w-full border border-line bg-paper px-4 pr-12 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    cr
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {[10, 50, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      {value}
                    </button>
                  ))}
                  {walletBalance !== null && walletBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(walletBalance))}
                      className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      Max
                    </button>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    Est. payout if {outcome} wins
                  </span>
                  <span className="font-mono text-sm font-medium text-ink">
                    {estimatedPayout !== null
                      ? `${formatCredits(estimatedPayout)} cr`
                      : "—"}
                  </span>
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="mt-4 border border-no/30 bg-no-soft p-3 text-sm text-no"
                  >
                    {formError}
                  </p>
                )}

                {successMessage && (
                  <p className="mt-4 border border-yes/30 bg-yes-soft p-3 text-sm text-yes">
                    {successMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleBet}
                  disabled={submitting || !validAmount}
                  className={`mt-4 w-full px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
                    outcome === "YES"
                      ? "bg-yes text-white hover:opacity-90"
                      : "bg-no text-white hover:opacity-90"
                  }`}
                >
                  {submitting
                    ? "Placing bet…"
                    : validAmount
                      ? `Bet ${formatCredits(numericAmount)} cr on ${outcome}`
                      : `Bet on ${outcome}`}
                </button>

                <p className="mt-3 font-mono text-[9px] uppercase leading-4 tracking-[0.1em] text-muted">
                  Pooled payout. Prices are set by stake, not an order book.
                </p>
              </>
            )}
          </div>

          {hasPool && market.status === "OPEN" && (
            <div className="border-t border-line px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Payout math
              </p>

              <dl className="mt-3 space-y-2 font-mono text-[11px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className={outcome === "YES" ? "text-yes" : "text-muted"}>
                    1 cr on yes
                  </dt>
                  <dd className="text-ink">
                    {yesMultiplier
                      ? `≈ ${yesMultiplier} cr if yes wins`
                      : "No pool yet"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className={outcome === "NO" ? "text-no" : "text-muted"}>
                    1 cr on no
                  </dt>
                  <dd className="text-ink">
                    {noMultiplier
                      ? `≈ ${noMultiplier} cr if no wins`
                      : "No pool yet"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-[11px] leading-5 text-muted">
                Your return shrinks as more credits join the side you back.
                Figures assume today&apos;s pools.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
