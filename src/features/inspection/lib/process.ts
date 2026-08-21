// 공정 표시명은 서버 목록에서 온다 — features/process 의 useProcessLabel 을 쓸 것.
// 슬롯 구성(초·중·종만 쓰는지 등)도 공정 스케줄이 진실의 원천이라 여기서 판단하지 않는다.

// 금형 교체 등으로 차수를 중간에 끊는 조기 마감은 ST 담당 공정에서만 쓴다.
// 다른 공정에서는 아예 버튼을 내보내지 않는다.
//
// 공정이 DB 로 옮겨간 뒤에도 이 목록만 코드에 남는다 — 대응하는 공정 플래그가
// 백엔드에 없어서다(hardnessTracked/bundledReport/autoCopyNightCrossCheck 뿐).
// 조기 마감 대상 공정이 늘면 여기를 고쳐야 하고, 플래그가 생기면 그걸로 교체한다.
const TERMINABLE_PROCESSES: readonly string[] = [
  "ST_CUTTING",
  "AL_CUTTING",
  "PRESS",
];

export function isTerminableProcess(process: string | undefined | null): boolean {
  if (!process) return false;
  return TERMINABLE_PROCESSES.includes(process);
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
