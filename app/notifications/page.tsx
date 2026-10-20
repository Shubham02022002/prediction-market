"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  market: { slug: string; status: string } | null;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

const TYPE_LABELS: Record<string, string> = {
  MARKET_RESOLVED: "Market resolved",
  MARKET_VOIDED: "Market voided",
};

export default function NotificationsPage() {
  const { status } = useSession();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/notifications");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load notifications.");
      }

      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadNotifications();
    } else if (status === "unauthenticated") {
      setData(null);
      setLoading(false);
    }
  }, [status, loadNotifications]);

  async function handleMarkAllRead() {
    if (marking || !data) {
      return;
    }

    setMarking(true);

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to mark notifications as read.");
      }

      const readAt = new Date().toISOString();
      setData({
        notifications: data.notifications.map((item) => ({
          ...item,
          readAt: item.readAt ?? readAt,
        })),
        unreadCount: 0,
      });
      window.dispatchEvent(new Event("notifications:updated"));
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Unable to mark notifications as read.",
      );
    } finally {
      setMarking(false);
    }
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Your account
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Notifications
            </h1>

            <dl className="flex gap-8 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <div>
                <dt>Unread</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink">
                  {data ? unreadCount : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-4 max-w-[58ch] text-sm leading-6 text-muted">
            Settlement and void updates for markets you hold or watch. We tell
            you when your credits move — no digging through the board required.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Inbox
            {unreadCount > 0 && (
              <span className="ml-2 border border-line bg-surface px-1.5 py-0.5 text-ink">
                {unreadCount} new
              </span>
            )}
          </p>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={marking || unreadCount === 0}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {marking ? "Marking…" : "Mark all read"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="border-b border-no/30 bg-no-soft px-4 py-4 text-sm text-no"
          >
            {error}
          </div>
        )}

        {status === "unauthenticated" ? (
          <div className="border-b border-line py-16">
            <p className="font-display text-2xl font-medium tracking-[-0.02em]">
              Sign in to see your notifications.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Updates are tied to your account and the markets you trade or
              watch.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex border border-ink bg-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85"
            >
              Sign in
            </Link>
          </div>
        ) : loading ? (
          <div aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 border-b border-line py-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-24 animate-pulse bg-line" />
                  <div className="mt-2 h-4 w-64 animate-pulse bg-line" />
                </div>
                <div className="h-3 w-16 animate-pulse bg-line" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="border-b border-line py-16">
            <p className="font-display text-2xl font-medium tracking-[-0.02em]">
              Nothing here yet.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Take a position or watch a market and settlement updates will
              land here.
            </p>
            <Link
              href="/markets"
              className="mt-6 inline-flex border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:border-line-strong hover:bg-surface"
            >
              Browse markets
            </Link>
          </div>
        ) : (
          <ul aria-label="Notifications">
            {notifications.map((item) => {
              const isUnread = item.readAt === null;
              const typeLabel = TYPE_LABELS[item.type] ?? "Update";

              const content = (
                <>
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${
                      isUnread ? "bg-accent" : "bg-line"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        {typeLabel}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        {formatDate(item.createdAt)}
                      </span>
                    </span>
                    <span
                      className={`mt-1 block text-sm ${
                        isUnread ? "font-medium text-ink" : "text-muted"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.body && (
                      <span className="mt-0.5 block truncate text-sm text-muted">
                        {item.body}
                      </span>
                    )}
                  </span>
                  {item.market && (
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                    >
                      View →
                    </span>
                  )}
                </>
              );

              return (
                <li key={item.id} className="border-b border-line">
                  {item.market ? (
                    <Link
                      href={`/markets/${item.market.slug}`}
                      className="flex items-start gap-3 px-1 py-5 transition-colors hover:bg-surface"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-1 py-5">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
        <p className="border-t border-line pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Showing the latest {notifications.length || 0} of your updates.
        </p>
      </div>
    </main>
  );
}
