import type { InspectionProcess } from "../type/types";

const PROCESS_LABELS: Record<InspectionProcess, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL 절단",
  ST_CUTTING: "스틸 절단",
  MACHINING: "기계가공",
  PRESS: "프레스",
};

export function getProcessLabel(process: string): string {
  return PROCESS_LABELS[process as InspectionProcess] ?? process;
}

// EXTRUSION 과 PRESS 는 DAY_1~3 만 사용하는 단축 공정.
// 나머지 (AL_CUTTING / ST_CUTTING / MACHINING) 는 백엔드 기본 슬롯 정책을 따른다.
const SHORT_PROCESSES: readonly InspectionProcess[] = ["EXTRUSION", "PRESS"];

export function isShortProcess(process: string): boolean {
  return (SHORT_PROCESSES as readonly string[]).includes(process);
}
