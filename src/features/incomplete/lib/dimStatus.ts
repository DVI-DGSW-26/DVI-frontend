import type { InspectionDetailResult } from "../../inspection/type/types";
import { judgeMeasurement } from "../../inspection/lib/judgment";

// 미완료 결재 화면의 항목 번호 줄 — 항목 하나가 어떤 상태인지.
// - empty: 작업자가 비워 둔 항목 (이 검사가 미완료인 이유)
// - pass / fail: 측정값이 있고 기준 안 / 밖 (OK/NG 항목은 작업자가 고른 값)
export type DimState = "empty" | "pass" | "fail";

export function dimState(r: InspectionDetailResult): DimState {
  if (r.valueType === "PASS_FAIL") {
    if (r.passFailResult == null) return "empty";
    return r.passFailResult === "OK" ? "pass" : "fail";
  }
  if (r.measuredValue == null) return "empty";
  return judgeMeasurement(
    r.measuredValue,
    r.standardValue,
    r.toleranceUpper,
    r.toleranceLower,
  ) === "fail"
    ? "fail"
    : "pass";
}
