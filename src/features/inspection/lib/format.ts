export function formatSlotTime(time: string | null | undefined): string {
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

// 응답에 dimName 이 빠질 수 있어 화면 표시용 fallback.
// `DIM 1` 처럼 dimNo 기반 라벨로 대체. 빈 문자열도 "없음"으로 본다.
export function dimDisplayName(dim: {
  dimName?: string | null;
  dimNo: number;
}): string {
  const name = dim.dimName?.trim();
  if (name) return name;
  return `DIM ${dim.dimNo}`;
}
