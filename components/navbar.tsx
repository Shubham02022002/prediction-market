"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    if (status !== "authenticated") {
      setBalance(null);
      return;
    }

    try {
      const response = await fetch("/api/wallet");
      if (!response.ok) {
        setBalance(null);
        return;
      }
      const data = await response.json();
      setBalance(data.wallet.balance);
    } catch {
      setBalance(null);
    }
  }, [status]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance, pathname]);

  useEffect(() => {
    const handleWalletUpdate = () => {
      loadBalance();
    };

    window.addEventListener("wallet:updated", handleWalletUpdate);
    return () => window.removeEventListener("wallet:updated", handleWalletUpdate);
  }, [loadBalance]);

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-lg font-bold text-slate-950">
              P
            </span>
            <span className="text-base font-semibold tracking-tight">
              Prediction Market
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {status === "authenticated" ? (
            <>
              <span className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-300">
                {balance === null ? "—" : balance.toLocaleString()} cr
              </span>

              <span className="hidden text-sm text-slate-400 sm:block">
                {session.user.name ?? session.user.email}
              </span>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Sign out
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Create account
              </Link>
            </>
          ) : (
            <span className="text-sm text-slate-500">Loading…</span>
          )}
        </div>
      </div>
    </header>
  );
}
