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

// 공차는 부호 포함 편차라 값을 그대로 쓰되 양수엔 + 를 붙여 도면 표기와 맞춘다.
// (+0.2 / -0.1, 단측 공차면 -0.25 / -0.4 처럼 둘 다 음수일 수 있다.)
function signed(n: number): string {
  const text = Number.isInteger(n) ? String(n) : n.toString();
  return n > 0 ? `+${text}` : text;
}

export function formatTolerance(upper: number, lower: number): string {
  return `${signed(upper)} / ${signed(lower)}`;
}

export function formatStandardWithTolerance(
  standard: number,
  upper: number,
  lower: number,
): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toString());
  // 대칭 공차(상한 = -하한)는 현장에서 쓰는 ± 표기로 줄여 보여준다.
  if (upper === -lower && upper >= 0) return `${fmt(standard)} ±${fmt(upper)}`;
  return `${fmt(standard)} ${signed(upper)}/${signed(lower)}`;
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
