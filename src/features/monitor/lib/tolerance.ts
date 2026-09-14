// 측정값이 허용 범위 어디쯤인지 "그림"으로 보여주기 위한 계산.
//
// 숫자 두 개(측정값·허용범위)를 나란히 적어두면 벽에서 5m 떨어진 사람은 둘을 비교해
// 주지 않는다. 눈금 위 점 하나로 바꾸면 "가운데냐 가장자리냐"가 읽는 즉시 보인다.

/** 허용 구간 [min, max] — 부호공차 기준(기준값+하한 ~ 기준값+상한). */
export interface Band {
  min: number;
  max: number;
}

/** 눈금에서 허용 구간이 차지하는 자리 — 양쪽 20% 는 이탈값이 설 자리로 비워둔다. */
export const BAND_START = 0.2;
export const BAND_SPAN = 0.6;

/** 문자열/숫자 어느 쪽으로 와도 숫자로 읽는다. 못 읽으면 null. */
export function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

/** "9.90 ~ 10.10" → { min, max }. 형식이 다르면 null — 그때는 게이지를 그리지 않는다. */
export function parseAllowedRange(text: string | null | undefined): Band | null {
  if (!text) return null;
  const m = /^\s*(-?[\d.]+)\s*~\s*(-?[\d.]+)\s*$/.exec(text);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null;
  return { min, max };
}

/** 기준값 + 부호공차 → 허용 구간. 상·하한이 둘 다 음수인 단측 공차도 그대로 계산된다. */
export function bandOf(
  standardValue: number,
  toleranceUpper: number,
  toleranceLower: number,
): Band {
  const a = standardValue + toleranceLower;
  const b = standardValue + toleranceUpper;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

/**
 * 눈금 위 위치(0~1). 허용 구간은 가운데 60% 에 선형으로 펴고, 벗어난 값은 남은
 * 20% 안에서 "공차폭의 몇 배나 벗어났는지"에 비례해 민다 — 100배 벗어난 값이
 * 화면 밖으로 날아가지 않으면서, 살짝 벗어난 값과 크게 벗어난 값이 구분된다.
 */
export function gaugeOffset(value: number, band: Band): number {
  const span = band.max - band.min;
  if (!(span > 0)) {
    // 공차가 0 인 항목 — 안/밖 셋 중 하나로만 세운다.
    if (value < band.min) return BAND_START / 2;
    if (value > band.max) return 1 - BAND_START / 2;
    return 0.5;
  }
  if (value < band.min) {
    const over = Math.min(1, (band.min - value) / span);
    return BAND_START * (1 - over);
  }
  if (value > band.max) {
    const over = Math.min(1, (value - band.max) / span);
    return BAND_START + BAND_SPAN + BAND_START * over;
  }
  return BAND_START + BAND_SPAN * ((value - band.min) / span);
}

/** 소수 자릿수를 값에 맞춰 자른다 — 10 은 "10", 10.4 는 "10.4", 10.40 은 "10.4". */
export function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(4)));
}

/** 기준값 대비 편차 — "+0.12" 처럼 부호를 붙여 어느 쪽으로 벗어났는지 보인다. */
export function formatDeviation(value: number, standard: number): string {
  const d = Number((value - standard).toFixed(4));
  return d > 0 ? `+${formatValue(d)}` : formatValue(d);
}

/** 허용 구간을 벗어난 정도 — 공차폭 대비 배수. 안쪽이면 0. */
export function overshoot(value: number, band: Band): number {
  const span = band.max - band.min;
  if (!(span > 0)) return value < band.min || value > band.max ? 1 : 0;
  if (value < band.min) return (band.min - value) / span;
  if (value > band.max) return (value - band.max) / span;
  return 0;
}
