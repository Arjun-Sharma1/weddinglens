export function formatEventDate(date: string | null): string {
  if (!date) return "";
  // Parse as a plain calendar date (avoid TZ shifting a date-only string).
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
