import { judgeMeasurement } from "./judgment";
import type { StepResult } from "../type/types";

/** 측정 항목 번호 칸 하나의 상태 — 측정됨(합격/불합격) · 비워 둠 · 아직 안 함. */
export type StepChipState = "done" | "fail" | "skipped" | "empty";

/** 저장된(또는 이번에 입력한) 결과 하나를 번호 칸 상태로. 결과가 없으면 아직 안 한 칸. */
export function toChipState(result: StepResult | undefined): StepChipState {
  if (!result) return "empty";
  if (result.status === "skipped") return "skipped";
  if (result.passFailResult === "NG") return "fail";
  if ((result.valueType ?? "NUMBER") === "NUMBER") {
    const judgment = judgeMeasurement(
      result.measuredValue,
      result.standardValue,
      result.toleranceUpper,
      result.toleranceLower,
    );
    if (judgment === "fail") return "fail";
  }
  return "done";
}
