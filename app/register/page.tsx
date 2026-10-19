"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";

type FieldErrors = Record<string, string[] | undefined>;

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const fieldErrors = data?.details?.fieldErrors as
          | FieldErrors
          | undefined;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors).flat().find(Boolean)
          : undefined;

        setError(firstFieldError ?? data?.error ?? "Unable to create account.");
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        router.push("/login");
        return;
      }

      router.push("/markets");
      router.refresh();
    } catch {
      setError("Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Create an account"
      title="Start forecasting."
      subtitle="Open an account with 1,000 virtual credits and take your first position on the board."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Already trading?{" "}
            <Link
              href="/login"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              Sign in
            </Link>
          </p>
          <Link
            href="/markets"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
          >
            Browse markets →
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
          >
            <span>Display name</span>
            <span className="normal-case tracking-normal text-muted/70">
              Optional
            </span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            minLength={3}
            maxLength={20}
            placeholder="Ada Lovelace"
            className="mt-2 h-12 w-full border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink"
          />
        </div>

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

        <div>
          <label
            htmlFor="password"
            className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
          >
            <span>Password</span>
            <span className="normal-case tracking-normal text-muted/70">
              8–20 characters
            </span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={20}
            placeholder="Choose a password"
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
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="font-mono text-[9px] uppercase leading-4 tracking-[0.1em] text-muted">
          By creating an account you agree to trade with virtual credits only.
          No real money is involved.
        </p>
      </form>
    </AuthShell>
  );
}
