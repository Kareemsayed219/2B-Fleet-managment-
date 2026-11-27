/** Today's date in Cairo as YYYY-MM-DD (the fleet operates on Egypt time). */
export function todayCairo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
}

export function daysUntil(isoDate: string, from = todayCairo()): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
