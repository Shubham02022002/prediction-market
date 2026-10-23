"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth-shell";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Unable to reset the password. Try again.",
        );
      }

      setMessage(payload?.message ?? "Password updated. You can sign in now.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to reset the password. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const footer = (
    <p className="text-sm text-muted">
      Need a fresh link?{" "}
      <Link
        href="/forgot-password"
        className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
      >
        Request another
      </Link>
    </p>
  );

  if (!token) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="That link is incomplete."
        subtitle="The reset link is missing its token. Request a new one and open the latest email."
        footer={footer}
      >
        <p className="text-sm leading-6 text-muted">
          Reset links can only be used once and expire after one hour.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password."
      subtitle="Pick something you haven't used here before. The link works once and expires in an hour."
      footer={footer}
    >
      {message ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Password updated
          </p>
          <p role="status" className="mt-3 text-sm leading-6 text-ink">
            {message}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={20}
              placeholder="At least 8 characters"
              required
              className="mt-2 h-12 w-full border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink"
            />
          </div>

          <div>
            <label
              htmlFor="password-confirmation"
              className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
            >
              Confirm password
            </label>
            <input
              id="password-confirmation"
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={20}
              placeholder="Repeat the new password"
              required
              className="mt-2 h-12 w-full border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="border border-no/30 bg-no-soft p-3 text-sm text-no"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-ink font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Updating…" : "Set new password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
