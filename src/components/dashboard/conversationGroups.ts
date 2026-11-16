/** Recency groups for the conversation list in the sidebar. Pure, so it is unit-tested. */

export type RecencyGroup = "Today" | "Yesterday" | "Previous 7 days" | "Previous 30 days" | "Older";

const ORDER: RecencyGroup[] = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const DAY = 24 * 60 * 60 * 1000;

/** Which group a timestamp falls in, by calendar day in the device's time zone. */
export function recencyGroup(iso: string, now: Date = new Date()): RecencyGroup {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "Older";
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  if (days < 30) return "Previous 30 days";
  return "Older";
}

/**
 * Groups items (already sorted newest first) by `updated_at`, keeping their order.
 * Empty groups are left out.
 */
export function groupByRecency<T extends { updated_at: string }>(
  items: T[],
  now: Date = new Date(),
): Array<{ label: RecencyGroup; items: T[] }> {
  const buckets = new Map<RecencyGroup, T[]>();
  for (const item of items) {
    const g = recencyGroup(item.updated_at, now);
    const list = buckets.get(g);
    if (list) list.push(item);
    else buckets.set(g, [item]);
  }
  return ORDER.filter((g) => buckets.has(g)).map((g) => ({ label: g, items: buckets.get(g)! }));
}

/** First name for the greeting: the first word of the full name, if any. */
export function firstName(fullName: string | null | undefined): string | null {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first ? first : null;
}

/** "Good morning" / "Good afternoon" / "Good evening" by the device's local hour. */
export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}
