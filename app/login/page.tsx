"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push("/markets");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);

    try {
      await signIn("google", { callbackUrl: "/markets" });
    } catch {
      setError("Unable to sign in with Google. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back."
      subtitle="Sign in to check your balance, take a position, and settle up when the market resolves."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            New to Foretell?{" "}
            <Link
              href="/register"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              Create an account
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
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="flex h-12 w-full items-center justify-center gap-3 border border-line-strong bg-surface text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="font-mono text-xs font-semibold">G</span>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-line" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              Or use email
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

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

        <div>
          <label
            htmlFor="password"
            className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your password"
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
          disabled={loading || googleLoading}
          className="h-12 w-full bg-ink font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
