// 측정값이 기준(standardValue) ± 허용공차(plus / minus) 범위 안인지 판정.
// 측정값이 없거나 유한수가 아니면 null — 호출부는 뱃지를 숨긴다.
export type Judgment = "pass" | "fail" | null;

export function judgeMeasurement(
  measuredValue: number | null | undefined,
  standardValue: number,
  tolerancePlus: number,
  toleranceMinus: number,
): Judgment {
  if (measuredValue == null || !Number.isFinite(measuredValue)) return null;
  const min = standardValue - toleranceMinus;
  const max = standardValue + tolerancePlus;
  return measuredValue >= min && measuredValue <= max ? "pass" : "fail";
}
