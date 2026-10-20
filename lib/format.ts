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

export function formatInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function formatSignedCredits(value: number) {
  if (value > 0) {
    return `+${formatCredits(value)}`;
  }

  if (value < 0) {
    return `−${formatCredits(Math.abs(value))}`;
  }

  return "0";
}
