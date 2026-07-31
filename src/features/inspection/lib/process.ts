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

// 금형 교체 등으로 차수를 중간에 끊는 조기 마감은 ST 담당 공정에서만 쓴다.
// 다른 공정에서는 아예 버튼을 내보내지 않는다.
const TERMINABLE_PROCESSES: readonly InspectionProcess[] = [
  "ST_CUTTING",
  "AL_CUTTING",
  "PRESS",
];

export function isTerminableProcess(process: string | undefined | null): boolean {
  if (!process) return false;
  return (TERMINABLE_PROCESSES as readonly string[]).includes(process);
}

/**
 * 이 검사가 ST 담당(ST 절단·AL 절단·프레스) 것인지.
 *
 * 제품과 설비 양쪽의 공정을 본다 — 현장에서 공정을 가르는 건 설비인데 제품 쪽 공정이
 * 다르게 등록돼 있는 경우가 있어, 한쪽만 보면 버튼이 안 나온다.
 */
export function isTerminableInspection(inspection: {
  product?: { process?: string };
  equipment?: { process?: string };
}): boolean {
  const match =
    isTerminableProcess(inspection.equipment?.process) ||
    isTerminableProcess(inspection.product?.process);
  if (!match && import.meta.env.DEV) {
    // 안 뜨는 이유를 바로 알 수 있게 실제 값을 남긴다 (개발 빌드에서만).
    console.warn(
      "[terminate] ST 담당 공정이 아니라 마감 버튼을 숨김:",
      "product.process =",
      inspection.product?.process,
      "/ equipment.process =",
      inspection.equipment?.process,
    );
  }
  return match;
}
