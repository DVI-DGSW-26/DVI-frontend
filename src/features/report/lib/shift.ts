import { kstHour } from "../../../lib/datetime";
import { SLOT_SEQUENCE } from "../../inspection/lib/slotSequence";
import type { InspectionProcess } from "../../inspection/type/types";
import type { ReportDetail, ReportStageInfo } from "../api/types";
import { STAGE_ORDER } from "./stageMeasurements";

export type WorkShift = "DAY" | "NIGHT";

/** 야간 시작 시각. 17시 정각부터 야간이다 (현장 규칙, 백엔드 판별 로직과 동일). */
export const NIGHT_SHIFT_START_HOUR = 17;

export const SHIFT_LABEL: Record<WorkShift, string> = {
  DAY: "주간",
  NIGHT: "야간",
};

// 초 → 중 → 종 중 가장 앞 차수.
function firstStage(
  stages: ReportStageInfo[] | undefined,
): ReportStageInfo | undefined {
  if (!stages || stages.length === 0) return undefined;
  return [...stages].sort(
    (a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9),
  )[0];
}

// 이 공정에 야간 슬롯이 정의돼 있는지. 슬롯 정의를 그대로 보고 판단해야
// 나중에 압출·프레스에 야간 슬롯이 추가돼도 이 파일을 같이 고치지 않아도 된다.
function hasNightSlots(process: string): boolean {
  const seq = SLOT_SEQUENCE[process as InspectionProcess];
  return !!seq?.some((t) => t.startsWith("NIGHT_"));
}

/**
 * 보고서 한 건의 근무조(주간/야간). 판정할 수 없으면 null → 호출부에서 숨긴다.
 *
 * **초품 기준 1회만** 판정하고 중·종은 그 결과를 따른다. 야간 작업의 중품은
 * 새벽 01시, 종품은 05시라 차수마다 따로 물으면 주간으로 뒤집히고, 압출은
 * 종품을 다음날 아침에 순회검사자가 확인해 더 확실하게 뒤집힌다.
 *
 * 실제 검사 시각(inspectedAt)이 1순위다. 없을 때만 슬롯 타입으로 폴백하는데,
 * `NIGHT_*` 는 확실하지만 `DAY_*` 는 야간 슬롯이 있는 공정에서만 주간이라고
 * 단정할 수 있다 — 압출·프레스는 야간 슬롯 자체가 없어 야간 작업도 `DAY_*` 로
 * 기록된다.
 */
export function resolveShift(detail: ReportDetail): WorkShift | null {
  const first = firstStage(detail.stages);

  const hour = kstHour(first?.inspectedAt);
  if (hour != null) return hour >= NIGHT_SHIFT_START_HOUR ? "NIGHT" : "DAY";

  const type = first?.type ?? detail.inspectionType;
  if (type?.startsWith("NIGHT_")) return "NIGHT";
  if (type?.startsWith("DAY_") && hasNightSlots(detail.process)) return "DAY";
  return null;
}
