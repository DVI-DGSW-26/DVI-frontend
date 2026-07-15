import type { MyInspection } from "../type/types";
import { getNextSlot as getNextSlotStatic } from "../../inspection/lib/slotSequence";

export interface NextEligibleItem {
  /** 직전 검사 — 클릭 시 POST /inspection/{previousId}/next 에 쓰임. */
  previous: MyInspection;
  /** 다음 시점 type 코드 (예: "DAY_2"). */
  nextType: string;
}

// 다음 시점 계산 함수 시그니처. 기본은 하드코딩 시퀀스지만, 호출부에서 백엔드 슬롯 기반
// 함수(useSlotSequences)를 주입하면 실제 슬롯 순서로 계산한다.
type GetNextSlot = (process: string, currentType: string) => string | null;

/**
 * "이어서 할 일" 후보 추출.
 *
 * - COMPLETED 검사 중 다음 시점이 존재하고,
 * - 그 다음 시점이 아직 시작/SKIPPED 되지 않은 것만,
 * - 같은 (productId, equipmentId) 조합당 가장 최근 1건만 남긴다.
 */
export function extractNextEligible(
  inspections: MyInspection[],
  getNextSlot: GetNextSlot = getNextSlotStatic,
): NextEligibleItem[] {
  // 같은 (productId, equipmentId) 묶음에 다음 시점(type) 이 이미 존재하는지 빠르게 보기 위한 인덱스.
  const slotIndex = new Set<string>();
  for (const i of inspections) {
    slotIndex.add(`${i.product.id}-${i.equipment.id}-${i.type}`);
  }

  const eligible: NextEligibleItem[] = [];
  const seenPair = new Set<string>();

  for (const ins of inspections) {
    if (ins.status !== "COMPLETED") continue;
    const nextType = getNextSlot(ins.product.process, ins.type);
    if (!nextType) continue;
    const nextKey = `${ins.product.id}-${ins.equipment.id}-${nextType}`;
    // 다음 시점이 이미 시작/완료/SKIPPED 됐으면 후보 아님.
    if (slotIndex.has(nextKey)) continue;
    const pairKey = `${ins.product.id}-${ins.equipment.id}`;
    if (seenPair.has(pairKey)) continue;
    seenPair.add(pairKey);
    eligible.push({ previous: ins, nextType });
  }

  return eligible;
}

/**
 * "가장 최근 완료" 1건 추출 — 홈/현황 상단 강조 카드용.
 *
 * - COMPLETED 검사 중 다음 시점이 존재하고,
 * - 그 다음 시점이 아직 시작/SKIPPED 되지 않은 것 중에서,
 * - 완료 시각이 가장 최신인 1건만 반환. 없으면 null.
 *
 * 완료 시각은 completedAt 우선, 없으면 updatedAt → createdAt 순으로 폴백하고
 * 시각 정보가 전혀 없으면 inspectionId(증가값) 로 최신성을 근사한다.
 */
export function extractLatestCompletedNext(
  inspections: MyInspection[],
  getNextSlot: GetNextSlot = getNextSlotStatic,
): NextEligibleItem | null {
  const slotIndex = new Set<string>();
  for (const i of inspections) {
    slotIndex.add(`${i.product.id}-${i.equipment.id}-${i.type}`);
  }

  let best: NextEligibleItem | null = null;
  let bestTs = -Infinity;

  for (const ins of inspections) {
    if (ins.status !== "COMPLETED") continue;
    const nextType = getNextSlot(ins.product.process, ins.type);
    if (!nextType) continue;
    const nextKey = `${ins.product.id}-${ins.equipment.id}-${nextType}`;
    // 다음 시점이 이미 시작/완료/SKIPPED 됐으면 후보 아님.
    if (slotIndex.has(nextKey)) continue;
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
