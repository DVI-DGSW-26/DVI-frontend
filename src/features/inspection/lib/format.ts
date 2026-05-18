export function formatSlotTime(time: string): string {
  if (!time) return "";
  const [h = "", m = ""] = time.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function formatInspectionTime(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da} ${h}:${mi}`;
}

export function formatTolerance(plus: number, minus: number): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toString());
  return `+${fmt(plus)} / -${fmt(minus)}`;
}

export function formatStandardWithTolerance(
  standard: number,
  plus: number,
  minus: number,
): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toString());
  if (plus === minus) return `${fmt(standard)} ±${fmt(plus)}`;
  return `${fmt(standard)} +${fmt(plus)}/-${fmt(minus)}`;
}
