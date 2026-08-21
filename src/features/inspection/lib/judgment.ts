// 측정값이 허용 범위 안인지 판정.
//
// 공차는 "크기(+/-)"가 아니라 **부호 포함 편차**다 — 도면 표기를 그대로 옮긴 값이라
// 상한·하한이 둘 다 음수인 단측 공차("86 -0.25/-0.4")도 그대로 계산된다.
//   최대 허용값 = standardValue + toleranceUpper
//   최소 허용값 = standardValue + toleranceLower
//
// 측정값이 없거나 유한수가 아니면 null — 호출부는 뱃지를 숨긴다.
export type Judgment = "pass" | "fail" | null;

export function judgeMeasurement(
  measuredValue: number | null | undefined,
  standardValue: number,
  toleranceUpper: number,
  toleranceLower: number,
): Judgment {
  if (measuredValue == null || !Number.isFinite(measuredValue)) return null;
  const min = standardValue + toleranceLower;
  const max = standardValue + toleranceUpper;
  return measuredValue >= min && measuredValue <= max ? "pass" : "fail";
}
