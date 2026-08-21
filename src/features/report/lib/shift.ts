import { kstHour, WORK_DAY_START_HOUR } from "../../../lib/datetime";
import type { Shift } from "../../inspection-schedule/api";
import type {
  ReportDetail,
  ReportStageInfo,
  ReportSummary,
} from "../api/types";
import { STAGE_ORDER } from "./stageMeasurements";

export type WorkShift = Shift;

/** 야간 시작 시각. 17시 정각부터 야간이다 (현장 규칙, 백엔드 판별 로직과 동일). */
export const NIGHT_SHIFT_START_HOUR = 17;

/**
 * 이 시각에 시작한 작업이 야간인지.
 *
 * 17시~다음날 06시가 야간이다. 상한(06시)이 필요한 건 야간 작업이 자정을
 * 넘겨서도 이어지기 때문 — 실서버에 초·중·종을 01:17 / 04:13 / 05:42 에 기록한
 * 건이 있는데, "17시 이후" 만 보면 이게 주간으로 뒤집힌다. 경계는 작업일 경계와
 * 같은 06시를 쓴다(`WORK_DAY_START_HOUR`).
 */
function isNightHour(hour: number): boolean {
  return hour >= NIGHT_SHIFT_START_HOUR || hour < WORK_DAY_START_HOUR;
}

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

/**
 * 보고서 한 건의 근무조(주간/야간). 판정할 수 없으면 null → 호출부에서 숨긴다.
 *
 * **서버가 내려주는 shift 가 1순위다.** 슬롯 타입(DAY_1 등)으로 추론하면 안 된다 —
 * type 은 슬롯 순서를 매기는 내부 식별자라 실제 교대와 어긋날 수 있다.
 *
 * 시각 기반 추정은 shift 가 없는 구 보고서용 폴백으로만 남겨둔다. 이때도 **초품
 * 기준 1회만** 판정하고 중·종은 그 결과를 따른다 — 야간 작업의 중품은 새벽 01시,
 * 종품은 05시라 차수마다 따로 물으면 주간으로 뒤집히고, 압출은 종품을 다음날
 * 아침에 순회검사자가 확인해 더 확실하게 뒤집힌다.
 */
export function resolveShift(detail: ReportDetail): WorkShift | null {
  const first = firstStage(detail.stages);
  return detail.shift ?? first?.shift ?? shiftAt(first?.inspectedAt) ?? null;
}

// 검사 시각 하나로 판정. 값이 없거나 파싱 못 하면 null.
function shiftAt(inspectedAt: string | null | undefined): WorkShift | null {
  const hour = kstHour(inspectedAt);
  if (hour == null) return null;
  return isNightHour(hour) ? "NIGHT" : "DAY";
}

/**
 * 목록 카드(요약)의 근무조. 판정할 수 없으면 null → 카드에서 숨긴다.
 *
 * 서버 shift 가 1순위, 없으면 초품 실제 검사시각으로 폴백한다.
 */
export function resolveSummaryShift(summary: ReportSummary): WorkShift | null {
  return summary.shift ?? shiftAt(summary.initialInspectedAt) ?? null;
}

/** 차수(스테이지) 한 줄의 근무조 — 묶음 보고서는 주·야가 섞일 수 있다. */
export function resolveStageShift(
  stage: ReportStageInfo,
  fallback: WorkShift | null = null,
): WorkShift | null {
  return stage.shift ?? shiftAt(stage.inspectedAt) ?? fallback;
}
