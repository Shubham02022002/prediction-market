"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SideChip, StatusPill } from "@/components/market-ui";
import { formatCredits, formatDate } from "@/lib/format";

type Wallet = {
  balance: number;
  updatedAt: string;
};

type Bet = {
  id: string;
  outcome: "YES" | "NO";
  amount: number;
  createdAt: string;
  potentialPayout: number | null;
  multiplier: number | null;
  market: {
    slug: string;
    question: string;
    status: string;
    closesAt: string;
  };
};

type Summary = {
  realizedNet: number;
  atStake: number;
  potentialPayout: number;
  openBets: number;
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

export default function PortfolioPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          setSummary(betsData.summary ?? null);
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
              Portfolio
            </h1>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-xl border border-line bg-surface p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Sign in required
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">
              See your balance, positions, and ledger.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Your account keeps every bet and credit movement in one place, so
              you always know where you stand.
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

  const openPositions = summary?.openBets ?? 0;

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
                Portfolio
              </h1>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {session?.user?.email ?? "Signed in"}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {session?.user?.id && (
                <Link
                  href={`/traders/${session.user.id}`}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
                >
                  Public profile <span aria-hidden="true">→</span>
                </Link>
              )}
              <Link
                href="/markets"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
              >
                Browse markets <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
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

        <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-surface p-5 sm:p-6">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Available credits
            </dt>
            <dd className="mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em]">
              {wallet ? formatCredits(wallet.balance) : "—"}
            </dd>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              Ready to stake
            </p>
          </div>

          <div className="bg-surface p-5 sm:p-6">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Realized P&amp;L
            </dt>
            <dd
              className={`mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em] ${
                !summary || summary.realizedNet === 0
                  ? "text-ink"
                  : summary.realizedNet > 0
                    ? "text-yes"
                    : "text-no"
              }`}
            >
              {loading
                ? "—"
                : summary
                  ? `${summary.realizedNet > 0 ? "+" : summary.realizedNet < 0 ? "−" : ""}${formatCredits(Math.abs(summary.realizedNet))}`
                  : "—"}
            </dd>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              Settled markets
            </p>
          </div>

          <div className="bg-surface p-5 sm:p-6">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              At stake
            </dt>
            <dd className="mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em]">
              {loading || !summary ? "—" : formatCredits(summary.atStake)}
            </dd>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              Across {openPositions}{" "}
              {openPositions === 1 ? "open position" : "open positions"}
            </p>
          </div>

          <div className="bg-surface p-5 sm:p-6">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Potential payout
            </dt>
            <dd className="mt-2 font-display text-4xl font-semibold leading-none tracking-[-0.03em]">
              {loading || !summary
                ? "—"
                : formatCredits(summary.potentialPayout)}
            </dd>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              If every open pick wins
            </p>
          </div>
        </dl>

        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-3">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Positions
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {loading ? "Loading" : `${bets.length} bets`}
            </span>
          </div>

          {loading ? (
            <div aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border-b border-line py-5">
                  <div className="h-3 w-32 animate-pulse bg-line" />
                  <div className="mt-3 h-5 w-2/3 animate-pulse bg-line" />
                </div>
              ))}
            </div>
          ) : bets.length === 0 ? (
            <div className="border-b border-line py-12">
              <p className="font-display text-xl font-medium">
                No positions yet.
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Find a question you have a view on and take a side. Your open
                bets will show up here.
              </p>
              <Link
                href="/markets"
                className="mt-5 inline-block border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
              >
                Browse markets
              </Link>
            </div>
          ) : (
            <div>
              {bets.map((bet) => (
                <Link
                  key={bet.id}
                  href={`/markets/${bet.market.slug}`}
                  className="group grid gap-3 border-b border-line py-5 sm:grid-cols-[minmax(0,1fr)_80px_160px_150px] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={bet.market.status} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        Closes {formatDate(bet.market.closesAt)}
                      </span>
                    </div>
                    <p className="mt-2 max-w-[56ch] font-display text-[17px] font-medium leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
                      {bet.market.question}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:contents">
                    <div>
                      <SideChip side={bet.outcome} />
                    </div>
                    <div>
                      <p className="font-mono text-sm text-ink">
                        {formatCredits(bet.amount)} cr
                      </p>
                      {bet.potentialPayout !== null && (
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                          ≈ {formatCredits(bet.potentialPayout)} cr if{" "}
                          {bet.outcome} wins
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:text-right">
                    Placed {formatDate(bet.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 pb-16">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-3">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Credit history
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Latest {Math.min(entries.length, 20)} entries
            </span>
          </div>

          {loading ? (
            <div aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border-b border-line py-4">
                  <div className="h-4 w-1/2 animate-pulse bg-line" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="border-b border-line py-12">
              <p className="font-display text-xl font-medium">
                No credit movements yet.
              </p>
              <p className="mt-2 text-sm text-muted">
                Stakes, payouts, and refunds will appear here.
              </p>
            </div>
          ) : (
            <div>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 border-b border-line py-4 sm:grid-cols-[140px_minmax(0,1fr)_130px_120px] sm:items-center sm:gap-4"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                    {LEDGER_LABELS[entry.type] ?? entry.type}
                  </p>

                  <div className="min-w-0">
                    {entry.market ? (
                      <Link
                        href={`/markets/${entry.market.slug}`}
                        className="block truncate text-sm text-muted transition-colors hover:text-ink"
                      >
                        {entry.market.question}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">Account</span>
                    )}
                  </div>

                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:text-right">
                    {formatDate(entry.createdAt)}
                  </p>

                  <p
                    className={`font-mono text-sm sm:text-right ${
                      entry.amount >= 0 ? "text-yes" : "text-ink"
                    }`}
                  >
                    {entry.amount >= 0 ? "+" : ""}
                    {formatCredits(entry.amount)} cr
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
