const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  RESOLVED: "Resolved",
  VOID: "Void",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-yes/25 bg-yes-soft text-yes",
  CLOSED: "border-line-strong bg-surface text-muted",
  RESOLVED: "border-accent/25 bg-accent-soft text-accent",
  VOID: "border-line-strong bg-paper text-muted",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase leading-4 tracking-[0.12em] ${
        STATUS_STYLES[status] ?? "border-line-strong bg-surface text-muted"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ProbabilityBar({
  yes,
  className = "",
  trackClassName = "bg-line",
}: {
  yes: number;
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, yes));

  return (
    <div
      className={`flex h-1.5 w-full overflow-hidden ${trackClassName} ${className}`}
      aria-hidden="true"
    >
      <div className="h-full bg-yes" style={{ width: `${clamped}%` }} />
      <div className="h-full flex-1 bg-no" />
    </div>
  );
}

export function SideChip({ side }: { side: "YES" | "NO" }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] ${
        side === "YES" ? "bg-yes-soft text-yes" : "bg-no-soft text-no"
      }`}
    >
      {side}
    </span>
  );
}
