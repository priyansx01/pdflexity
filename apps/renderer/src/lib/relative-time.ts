/** Compact relative-time labels for the Recent list. */
export function relativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 2 * DAY) return "yesterday";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;

  const d = new Date(epochMs);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const month = d.toLocaleString("en-US", { month: "short" });
  return sameYear ? `${month} ${d.getDate()}` : `${month} ${d.getDate()}, ${d.getFullYear()}`;
}
