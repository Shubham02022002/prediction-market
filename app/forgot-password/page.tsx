"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Unable to send the reset link. Try again.",
        );
      }

      setMessage(
        payload?.message ??
          "If an account exists for that email, a reset link is on its way.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send the reset link. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot your password?"
      subtitle="Enter the email on your account and we'll send a link to choose a new password."
      footer={
        <p className="text-sm text-muted">
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {message ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Check your inbox
          </p>
          <p role="status" className="mt-3 text-sm leading-6 text-ink">
            {message}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            The link expires in one hour. If it doesn&apos;t arrive, check spam
            or request another.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
