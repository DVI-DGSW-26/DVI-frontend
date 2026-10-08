// 작업기준(기준값·하한 공차·상한 공차).
//
// 공차는 크기가 아니라 부호 포함 편차다 (허용 = 기준 + 하한 ~ 기준 + 상한).
// 한쪽 공차를 비우면 그쪽은 제한이 없다. 화면은 엑셀처럼 기준·하한·상한 세 칸을 그대로 두고,
// 기준 칸에 현장 표기를 치거나 붙여넣으면 세 칸으로 풀어 준다(parseStandardNotation):
//   "2.5~3.5"        → 기준 2.5, 하한 0, 상한 1
//   "6000±500"       → 기준 6000, 하한 -500, 상한 500
//   "38 이하"         → 기준 38, 하한 없음, 상한 0
//   "6 MIN"          → 기준 6, 하한 0, 상한 없음
//   "86 -0.25/-0.4"  → 기준 86, 하한 -0.4, 상한 -0.25 (기준이 허용 범위 밖인 단측 공차)

// 입력칸 값(문자열 그대로 — "38 이하"의 하한(빈칸)과 상한(0)처럼 빈칸과 0 은 뜻이 다르다).
export interface StandardDraft {
  standard: string;
  lower: string;
  upper: string;
}

export interface StandardValue {
  standardValue: number | null;
  toleranceLower: number | null;
  toleranceUpper: number | null;
}

export type StandardError = "incomplete" | "boundsReversed";

// 0.1 + 0.2 같은 부동소수 찌꺼기를 지운다.
function clean(n: number): number {
  return Number(n.toFixed(6));
}

function num(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : null;
}

function str(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

export const EMPTY_STANDARD: StandardDraft = { standard: "", lower: "", upper: "" };

/** 입력칸 → 서버 값. 칸이 전부 비었으면 전부 null. 기준값은 있어야 하고 공차는 한쪽만 있어도 된다. */
export function toStandardValue(
  d: StandardDraft,
): { value: StandardValue } | { error: StandardError } {
  if ([d.standard, d.lower, d.upper].every((s) => s.trim() === "")) {
    return { value: { standardValue: null, toleranceLower: null, toleranceUpper: null } };
  }
  const s = num(d.standard);
  const lo = num(d.lower);
  const up = num(d.upper);
  if (s == null) return { error: "incomplete" };
  if ((d.lower.trim() !== "" && lo == null) || (d.upper.trim() !== "" && up == null)) return { error: "incomplete" };
  if (lo != null && up != null && lo > up) return { error: "boundsReversed" };
  return { value: { standardValue: s, toleranceLower: lo, toleranceUpper: up } };
}

export function toStandardDraft(v: StandardValue): StandardDraft {
  return { standard: str(v.standardValue), lower: str(v.toleranceLower), upper: str(v.toleranceUpper) };
}

const NUM = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)`;
// 표기에 단위가 섞여 와도("38℃ 이하", "6mm MIN") 읽는다.
const UNIT = /℃|°C|mm\/sec|mm\/min|mm|sec/gi;

/**
 * 현장 표기 → 세 칸. 숫자 하나뿐이거나 읽을 수 없으면 null — 그때는 친 그대로 둔다.
 * 엑셀에서 기준 칸 하나에 "38 이하"처럼 적어 둔 값을 그대로 붙여넣을 수 있게 하려는 것.
 */
export function parseStandardNotation(text: string): StandardDraft | null {
  const s = text.replace(UNIT, " ").replace(/\s+/g, " ").trim();
  if (s === "") return null;
  let m: RegExpMatchArray | null;

  if ((m = s.match(new RegExp(`^(${NUM}) ?[~∼～] ?(${NUM})$`)))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const [from, to] = a <= b ? [a, b] : [b, a];
    return { standard: str(from), lower: "0", upper: str(clean(to - from)) };
  }
  if ((m = s.match(new RegExp(`^(${NUM}) ?(?:±|\\+/-) ?(${NUM})$`)))) {
    const tol = Math.abs(Number(m[2]));
    return { standard: str(Number(m[1])), lower: tol === 0 ? "0" : str(-tol), upper: str(tol) };
  }
  if ((m = s.match(new RegExp(`^(${NUM}) ?(?:이하|↓|max)$`, "i"))) || (m = s.match(new RegExp(`^(?:≤|<=) ?(${NUM})$`)))) {
    return { standard: str(Number(m[1])), lower: "", upper: "0" };
  }
  if ((m = s.match(new RegExp(`^(${NUM}) ?(?:이상|↑|min)$`, "i"))) || (m = s.match(new RegExp(`^(?:≥|>=) ?(${NUM})$`)))) {
    return { standard: str(Number(m[1])), lower: "0", upper: "" };
  }
  // "86 -0.25/-0.4", "50 +0.1/-0.2" — 두 공차 중 작은 쪽이 하한.
  if ((m = s.match(new RegExp(`^(${NUM}) ?([+-](?:\\d+\\.?\\d*|\\.\\d+)) ?/ ?([+-](?:\\d+\\.?\\d*|\\.\\d+))$`)))) {
    const a = Number(m[2]);
    const b = Number(m[3]);
    return { standard: str(Number(m[1])), lower: str(Math.min(a, b)), upper: str(Math.max(a, b)) };
  }
  return null;
}

/** 읽기용 표기 — "2.5 ~ 3.5", "6000 ±500", "38 이하", "6 이상", "86 -0.25/-0.4". */
export function formatStandard(
  v: StandardValue,
  words: { max: string; min: string },
): string {
  const { standardValue: s, toleranceLower: lo, toleranceUpper: up } = v;
  if (s == null) return "";
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  if (lo == null && up === 0) return `${s} ${words.max}`;
  if (up == null && lo === 0) return `${s} ${words.min}`;
  if (lo === 0 && up != null && up > 0) return `${s} ~ ${clean(s + up)}`;
  if (lo != null && up != null && up > 0 && lo === -up) return `${s} ±${up}`;
  if (lo == null && up == null) return String(s);
  return `${s} ${up == null ? "" : signed(up)}/${lo == null ? "" : signed(lo)}`;
}
