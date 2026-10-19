import Link from "next/link";
import { Logo } from "@/components/brand";
import { FeaturedMarketTicket, MarketBoard } from "@/components/live-markets";

const STEPS = [
  {
    title: "Pick a question",
    body: "Browse open markets on model releases, benchmarks, and industry milestones. Every question publishes its resolution source before trading opens.",
  },
  {
    title: "Take a side",
    body: "Back YES or NO with virtual credits. Your stake joins that side's pool, so the price moves as the crowd updates its view.",
  },
  {
    title: "Settle up",
    body: "When the market resolves, the winning side splits the entire pool in proportion to stake. No house edge, no spread.",
  },
];

const LEDGER_ROWS = [
  { type: "BET_STAKE", detail: "YES · 120 cr", amount: "−120" },
  { type: "BET_STAKE", detail: "NO · 80 cr", amount: "−80" },
  { type: "BET_PAYOUT", detail: "Resolved YES", amount: "+240" },
];

export default function LandingPage() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-yes" aria-hidden="true" />
            The AI forecast exchange
          </p>

          <h1 className="mt-6 max-w-[11ch] text-balance font-display text-[52px] font-semibold leading-[0.94] tracking-[-0.045em] text-ink sm:text-6xl lg:text-7xl">
            Trade what happens <span className="text-accent">next.</span>
          </h1>

          <p className="mt-6 max-w-[46ch] text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Take a YES or NO position on the models, benchmarks, and releases
            that define the industry. Prices move with the crowd. Winners split
            the pool.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/markets"
              className="inline-flex items-center gap-3 bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85"
            >
              Browse markets <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center border border-line-strong bg-surface px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              Create an account
            </Link>
          </div>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            1,000 credits on signup · Virtual money only
          </p>
        </div>

        <FeaturedMarketTicket />
      </section>

      <div className="border-y border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted sm:px-6 sm:text-[10px]">
          <span>Virtual credits only</span>
          <span>Public resolution rules</span>
          <span>Append-only ledger</span>
          <span>Pooled payouts</span>
        </div>
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              Live board
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Markets worth a position
            </h2>
          </div>
          <Link
            href="/markets"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
          >
            All markets <span aria-hidden="true">→</span>
          </Link>
        </div>

        <MarketBoard />
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            How it works
          </p>
          <h2 className="mt-3 max-w-[18ch] text-balance font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            From opinion to position in three steps.
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t border-ink pt-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  0{index + 1}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.01em]">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[36ch] text-sm leading-6 text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              The ledger
            </p>
            <h2 className="mt-3 max-w-[13ch] text-balance font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Every credit, accounted for.
            </h2>
            <p className="mt-5 max-w-[42ch] text-sm leading-6 text-paper/60">
              Stakes, payouts, and refunds are written to an append-only ledger.
              No hidden balance changes, no house edge, no fine print between
              you and the pool.
            </p>
            <p className="mt-8 max-w-[40ch] font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-paper/40">
              Balances are enforced by the bet endpoint. Settlement is atomic:
              either every payout lands or none do.
            </p>
          </div>

          <div className="border border-paper/15">
            <div className="flex items-center justify-between border-b border-paper/15 px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
                Sample ledger
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
                Balance 1,040 cr
              </span>
            </div>

            <ul>
              {LEDGER_ROWS.map((row) => (
                <li
                  key={`${row.type}-${row.detail}`}
                  className="flex items-center justify-between gap-4 border-b border-paper/10 px-4 py-4 last:border-b-0"
                >
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.04em] text-paper">
                      {row.type}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-paper/40">
                      {row.detail}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-sm ${
                      row.amount.startsWith("+")
                        ? "text-yes-soft"
                        : "text-paper/70"
                    }`}
                  >
                    {row.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-8 border border-ink bg-surface p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              Start forecasting
            </p>
            <h2 className="mt-3 max-w-[17ch] text-balance font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Your first 1,000 credits are on us.
            </h2>
            <p className="mt-4 max-w-[46ch] text-sm leading-6 text-muted">
              Open an account, take a side, and find out how good your read on
              the future really is.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-3 bg-accent px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
            >
              Open an account <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/markets"
              className="inline-flex items-center justify-center border border-line-strong px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              Browse markets
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
              Simulated markets · No real money
            </span>
          </div>

          <nav className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <Link href="/markets" className="transition-colors hover:text-ink">
              Markets
            </Link>
            <Link href="/portfolio" className="transition-colors hover:text-ink">
              Portfolio
            </Link>
            <Link href="/login" className="transition-colors hover:text-ink">
              Sign in
            </Link>
          </nav>

          <p className="font-mono text-[10px] text-muted">© 2026 Foretell</p>
        </div>
      </footer>
    </main>
  );
}
