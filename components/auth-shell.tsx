import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { ProbabilityBar } from "@/components/market-ui";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <div className="flex items-center justify-between">
          <Logo tone="paper" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/40">
            Est. 2026
          </span>
        </div>

        <div className="max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
            Sample market
          </p>
          <h2 className="mt-4 max-w-[14ch] text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.03em]">
            Put your conviction on the record.
          </h2>

          <div className="mt-8 border border-paper/15">
            <div className="flex items-center justify-between border-b border-paper/15 px-4 py-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/50">
                AI releases
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-yes-soft">
                Open
              </span>
            </div>

            <div className="p-4">
              <p className="font-display text-lg font-medium leading-snug tracking-[-0.01em]">
                Will OpenAI ship a new flagship model before December 31?
              </p>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40">
                    Yes
                  </p>
                  <p className="font-display text-3xl font-semibold leading-none text-yes-soft">
                    64%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40">
                    No
                  </p>
                  <p className="font-display text-3xl font-semibold leading-none text-no-soft">
                    36%
                  </p>
                </div>
              </div>

              <ProbabilityBar
                yes={64}
                className="mt-4"
                trackClassName="bg-paper/15"
              />

              <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-paper/40">
                <span>640 cr yes</span>
                <span>1,000 cr pool</span>
                <span>360 cr no</span>
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-[38ch] text-sm leading-6 text-paper/50">
            Prices are set by the pool, not a market maker. When the question
            resolves, the winning side splits everything.
          </p>
        </div>

        <div className="flex flex-wrap justify-between gap-4 border-t border-paper/15 pt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">
          <span>1,000 credits on signup</span>
          <span>Virtual money only</span>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-paper px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em]">
            {title}
          </h1>
          <p className="mt-3 max-w-[42ch] text-sm leading-6 text-muted">
            {subtitle}
          </p>

          <div className="mt-8 border border-line bg-surface p-6 sm:p-8">
            {children}
          </div>

          <div className="mt-6">{footer}</div>

          <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            Simulated exchange · No real money
          </p>
        </div>
      </main>
    </div>
  );
}
