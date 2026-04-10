const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses `from` / `to` query values: plain `YYYY-MM-DD` becomes start/end of that UTC day;
 * full ISO date-times are parsed with `Date` as usual.
 */
export function parseQueryRangeBound(
  value: string,
  bound: "from" | "to",
): Date {
  if (ISO_CALENDAR_DATE.test(value)) {
    const parts = value.split("-");
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (bound === "from") {
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  return new Date(value);
}
