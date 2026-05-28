import type { MyInspection } from "../type/types";
import { getNextSlot } from "../../inspection/lib/slotSequence";

export interface NextEligibleItem {
  /** 직전 검사 — 클릭 시 POST /inspection/{previousId}/next 에 쓰임. */
  previous: MyInspection;
  /** 다음 시점 type 코드 (예: "DAY_2"). */
  nextType: string;
}

/**
 * "이어서 할 일" 후보 추출.
 *
 * - COMPLETED 검사 중 다음 시점이 존재하고,
 * - 그 다음 시점이 아직 시작/SKIPPED 되지 않은 것만,
 * - 같은 (productId, equipmentId) 조합당 가장 최근 1건만 남긴다.
 */
export function extractNextEligible(
  inspections: MyInspection[],
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
