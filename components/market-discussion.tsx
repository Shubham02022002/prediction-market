"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { formatDate, formatInitials } from "@/lib/format";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
};

const MAX_LENGTH = 1000;

export function MarketDiscussion({ slug }: { slug: string }) {
  const { status } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`/api/markets/${slug}/comments`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load the discussion.");
        }

        if (!cancelled) {
          setComments(Array.isArray(data.comments) ? data.comments : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load the discussion.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handlePost() {
    const trimmed = body.trim();

    if (!trimmed || posting) {
      return;
    }

    setPosting(true);
    setPostError("");

    try {
      const response = await fetch(`/api/markets/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to post your comment.");
      }

      setComments((current) => [data.comment, ...current]);
      setBody("");
    } catch (error) {
      setPostError(
        error instanceof Error
          ? error.message
          : "Unable to post your comment.",
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-3">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
          Discussion
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {loading
            ? "Loading"
            : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
        </span>
      </div>

      {status === "authenticated" ? (
        <div className="mt-5 border border-line bg-surface p-4">
          <label htmlFor="discussion-body" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="discussion-body"
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            placeholder="Share an argument, a source, or a read on this market."
            className="w-full resize-y border-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-muted/70"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              {body.length}/{MAX_LENGTH}
            </span>
            <button
              type="button"
              onClick={handlePost}
              disabled={posting || body.trim().length === 0}
              className="bg-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted"
            >
              {posting ? "Posting…" : "Post comment"}
            </button>
          </div>
          {postError && (
            <p role="alert" className="mt-3 text-sm text-no">
              {postError}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-5 border border-line bg-surface px-4 py-3 text-sm text-muted">
          <Link
            href="/login"
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      {loadError && (
        <p role="alert" className="mt-5 text-sm text-no">
          {loadError}
        </p>
      )}

      {loading ? (
        <div aria-hidden="true" className="mt-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="flex gap-3 border-b border-line py-4"
            >
              <div className="h-8 w-8 shrink-0 animate-pulse bg-line" />
              <div className="w-full">
                <div className="h-3 w-32 animate-pulse bg-line" />
                <div className="mt-3 h-4 w-3/4 animate-pulse bg-line" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="mt-6 border-b border-line pb-6 text-sm text-muted">
          No comments yet. Make the first argument.
        </p>
      ) : (
        <div className="mt-2">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="flex gap-3 border-b border-line py-4"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-surface font-mono text-[10px] uppercase tracking-[0.04em] text-ink"
              >
                {formatInitials(comment.user.name)}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    href={`/traders/${comment.user.id}`}
                    className="text-sm text-ink transition-colors hover:text-accent"
                  >
                    {comment.user.name}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-6 text-ink/80">
                  {comment.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
