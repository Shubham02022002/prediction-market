export function formatCredits(value: number) {
  return value.toLocaleString("en-US");
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatCents(value: number) {
  return `${Math.round(value)}¢`;
}
