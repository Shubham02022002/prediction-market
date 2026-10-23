"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { formatCredits } from "@/lib/format";

const NAV_LINKS: { href: string; label: string; authOnly?: boolean }[] = [
  { href: "/markets", label: "Markets" },
  { href: "/watchlist", label: "Watchlist", authOnly: true },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/portfolio", label: "Portfolio" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const loadUnread = useCallback(async () => {
    if (status !== "authenticated") {
      setUnread(0);
      return;
    }

    try {
      const response = await fetch("/api/notifications?count=true");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setUnread(data.unreadCount ?? 0);
    } catch {
      // Keep the last known count when the request fails.
    }
  }, [status]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance, pathname]);

  useEffect(() => {
    loadUnread();
  }, [loadUnread, pathname]);

  useEffect(() => {
    const handleWalletUpdate = () => {
      loadBalance();
    };

    window.addEventListener("wallet:updated", handleWalletUpdate);
    window.addEventListener("notifications:updated", loadUnread);
    return () => {
      window.removeEventListener("wallet:updated", handleWalletUpdate);
      window.removeEventListener("notifications:updated", loadUnread);
    };
  }, [loadBalance, loadUnread]);

  const bareAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (bareAuthPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6 sm:gap-10">
          <Logo wordmarkClassName="hidden sm:inline" />

          <nav className="flex items-center gap-4 sm:gap-6">
            {NAV_LINKS.filter(
              (link) => !link.authOnly || status === "authenticated",
            ).map((link) => {
              const isActive = pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`border-b-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    isActive
                      ? "border-ink text-ink"
                      : "border-transparent text-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {session?.user.role === "ADMIN" && (
              <Link
                href="/admin"
                aria-current={
                  pathname.startsWith("/admin") ? "page" : undefined
                }
                className={`border-b-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  pathname.startsWith("/admin")
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {!mounted || status === "loading" ? (
            <span
              className="h-8 w-24 animate-pulse bg-line"
              aria-hidden="true"
            />
          ) : status === "authenticated" ? (
            <>
              <Link
                href="/notifications"
                aria-label={
                  unread > 0
                    ? `Notifications, ${unread} unread`
                    : "Notifications"
                }
                className={`relative flex h-8 w-8 items-center justify-center border bg-surface transition-colors hover:text-ink ${
                  pathname.startsWith("/notifications")
                    ? "border-ink text-ink"
                    : "border-line text-muted hover:border-line-strong"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path
                    d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-accent px-1 font-mono text-[9px] leading-none text-paper">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>

              <span className="flex items-center gap-2 border border-line bg-surface px-2.5 py-1.5">
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:inline">
                  Bal
                </span>
                <span className="font-mono text-xs font-medium text-ink">
                  {balance === null ? "—" : formatCredits(balance)}
                </span>
                <span className="font-mono text-[10px] text-muted">cr</span>
              </span>

              <span className="hidden max-w-36 truncate text-sm text-muted md:block">
                {session.user.name ?? session.user.email}
              </span>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="border border-ink bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85"
              >
                Start trading
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
