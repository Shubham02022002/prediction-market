import Link from "next/link";

export function Logo({
  tone = "ink",
  showWordmark = true,
  wordmarkClassName = "",
}: {
  tone?: "ink" | "paper";
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5"
      aria-label="Foretell home"
    >
      <span
        className={`relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-[5px] ${
          tone === "paper" ? "bg-paper" : "bg-ink"
        }`}
        aria-hidden="true"
      >
        <span className="absolute inset-y-0 right-0 w-1/2 bg-accent" />
        <span
          className={`absolute left-1/2 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${
            tone === "paper" ? "bg-ink" : "bg-paper"
          }`}
        />
      </span>
      {showWordmark && (
        <span
          className={`font-display text-[19px] font-semibold leading-none tracking-[-0.02em] ${
            tone === "paper" ? "text-paper" : "text-ink"
          } ${wordmarkClassName}`}
        >
          foretell
        </span>
      )}
    </Link>
  );
}
