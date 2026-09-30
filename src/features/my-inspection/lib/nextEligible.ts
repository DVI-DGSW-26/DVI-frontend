import type { MyInspection } from "../type/types";

export interface NextEligibleItem {
  /** 직전 검사 — 클릭 시 POST /inspection/{previousId}/next 에 쓰임. */
  previous: MyInspection;
  /** 다음 시점 type 코드 (예: "DAY_2"). */
  nextType: string;
}

// 다음 시점 계산 함수 시그니처. 호출부가 useSlotSequences() 의 getNextSlot 을 넘긴다 —
// 슬롯은 공정 스케줄(DB)에서 오므로 클라이언트에 기본값을 둘 수 없다.
type GetNextSlot = (process: string, currentType: string) => string | null;

/**
 * "이어서 할 일" 후보 추출.
 *
 * - COMPLETED 검사 중 다음 시점이 존재하고,
 * - 그 다음 시점이 같은 작업지시 안에서 아직 시작/SKIPPED 되지 않은 것만,
 * - 작업지시당 가장 최근 1건만 남긴다.
 *
 * 날짜로 거르지 않는다 — 야간 작업이 자정을 넘기면 자정 전에 끝낸 검사가 빠져
 * 카드가 통째로 사라졌다. 작업지시(orderId)는 교대 하나에 대응하므로, 전날 검사가
 * 오늘 시점을 막는 문제(날짜 필터를 넣었던 원래 이유)도 같이 해결된다.
 * 끝난 작업지시의 검사는 다음 시점이 이미 다 있거나 getNextSlot 이 null 이라 후보가 아니다.
 */
export function extractNextEligible(
  inspections: MyInspection[],
  getNextSlot: GetNextSlot,
): NextEligibleItem[] {
  // 같은 작업지시에 다음 시점(type) 이 이미 존재하는지 빠르게 보기 위한 인덱스.
  const slotIndex = new Set<string>();
  for (const i of inspections) {
    slotIndex.add(`${i.orderId}-${i.type}`);
  }

  const eligible: NextEligibleItem[] = [];
  const seenOrder = new Set<number>();

  for (const ins of inspections) {
    if (ins.status !== "COMPLETED") continue;
    const nextType = getNextSlot(ins.product.process, ins.type);
    if (!nextType) continue;
    // 다음 시점이 이미 시작/완료/SKIPPED 됐으면 후보 아님.
    if (slotIndex.has(`${ins.orderId}-${nextType}`)) continue;
    if (seenOrder.has(ins.orderId)) continue;
    seenOrder.add(ins.orderId);
    eligible.push({ previous: ins, nextType });
  }

  return eligible;
}

/**
 * "가장 최근 완료" 1건 추출 — 홈/현황 상단 강조 카드용.
 *
 * - COMPLETED 검사 중 다음 시점이 존재하고,
 * - 그 다음 시점이 같은 작업지시 안에서 아직 시작/SKIPPED 되지 않은 것 중에서,
 * - 완료 시각이 가장 최신인 1건만 반환. 없으면 null.
 *
 * 날짜로 거르지 않는 이유는 extractNextEligible 주석 참고.
 *
 * 완료 시각은 completedAt 우선, 없으면 updatedAt → createdAt 순으로 폴백하고
 * 시각 정보가 전혀 없으면 inspectionId(증가값) 로 최신성을 근사한다.
 */
export function extractLatestCompletedNext(
  inspections: MyInspection[],
  getNextSlot: GetNextSlot,
): NextEligibleItem | null {
  const slotIndex = new Set<string>();
  for (const i of inspections) {
    slotIndex.add(`${i.orderId}-${i.type}`);
  }

  let best: NextEligibleItem | null = null;
  let bestTs = -Infinity;

  for (const ins of inspections) {
    if (ins.status !== "COMPLETED") continue;
    const nextType = getNextSlot(ins.product.process, ins.type);
    if (!nextType) continue;
    // 다음 시점이 이미 시작/완료/SKIPPED 됐으면 후보 아님.
    if (slotIndex.has(`${ins.orderId}-${nextType}`)) continue;
    const ts = completionTs(ins);
    if (ts > bestTs) {
      bestTs = ts;
      best = { previous: ins, nextType };
    }
  }

  return best;
}

function completionTs(i: MyInspection): number {
  const raw = i.completedAt ?? i.updatedAt ?? i.createdAt;
  if (raw) {
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) return t;
  }
  return i.inspectionId;
}
