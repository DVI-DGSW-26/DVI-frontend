import type { MyInspection } from "../type/types";
import { isSameKstDay } from "../../../lib/datetime";

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
 * KST 기준 "오늘" 검사만 남긴다 — ScanPage 의 슬롯 계산과 같은 기준.
 *
 * 서버가 "오늘 검사" 판정을 UTC 로 해서 전날 검사를 KST 09:00(=UTC 자정)까지 계속
 * 내려주는데, 홈은 includeFinished=true 로 과거 이력까지 통째로 받는다. 날짜를 안
 * 거르면 전날 완료 건이 오늘 "이어서 할 일" 카드로 올라오고, 이미 종결된 시점에
 * 건너뛰기를 걸어 백엔드가 거절한다.
 *
 * 진행 중(DRAFT)은 자정을 넘겨 이어서 작업할 수 있으므로 날짜 무관하게 유지.
 * 날짜 필드가 없거나 파싱 불가하면(판단 보류) 기존 동작 유지 위해 통과시킨다.
 */
function isTodayInspection(ins: MyInspection, now: Date): boolean {
  if (ins.status === "DRAFT") return true;
  // inspectionTime 은 표시/스케줄용이라 신뢰도가 낮아 제외 — 실제 서버
  // 타임스탬프(createdAt/completedAt/updatedAt) 로만 오늘 여부를 판정.
  const dateSource = ins.createdAt ?? ins.completedAt ?? ins.updatedAt;
  return isSameKstDay(dateSource, now) !== false;
}

/**
 * "이어서 할 일" 후보 추출.
 *
 * - KST 기준 오늘 검사 중,
 * - COMPLETED 검사 중 다음 시점이 존재하고,
 * - 그 다음 시점이 아직 시작/SKIPPED 되지 않은 것만,
 * - 같은 (productId, equipmentId) 조합당 가장 최근 1건만 남긴다.
 */
export function extractNextEligible(
  inspections: MyInspection[],
  getNextSlot: GetNextSlot,
  now: Date = new Date(),
): NextEligibleItem[] {
  // 인덱스와 후보 스캔이 같은 모집단을 봐야 판정이 어긋나지 않으므로 먼저 거른다.
  const todays = inspections.filter((i) => isTodayInspection(i, now));

  // 같은 (productId, equipmentId) 묶음에 다음 시점(type) 이 이미 존재하는지 빠르게 보기 위한 인덱스.
  const slotIndex = new Set<string>();
  for (const i of todays) {
    slotIndex.add(`${i.product.id}-${i.equipment.id}-${i.type}`);
  }

  const eligible: NextEligibleItem[] = [];
  const seenPair = new Set<string>();

  for (const ins of todays) {
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
 * - KST 기준 오늘 검사 중,
 * - COMPLETED 검사 중 다음 시점이 존재하고,
 * - 그 다음 시점이 아직 시작/SKIPPED 되지 않은 것 중에서,
 * - 완료 시각이 가장 최신인 1건만 반환. 없으면 null.
 *
 * 완료 시각은 completedAt 우선, 없으면 updatedAt → createdAt 순으로 폴백하고
 * 시각 정보가 전혀 없으면 inspectionId(증가값) 로 최신성을 근사한다.
 */
export function extractLatestCompletedNext(
  inspections: MyInspection[],
  getNextSlot: GetNextSlot,
  now: Date = new Date(),
): NextEligibleItem | null {
  const todays = inspections.filter((i) => isTodayInspection(i, now));

  const slotIndex = new Set<string>();
  for (const i of todays) {
    slotIndex.add(`${i.product.id}-${i.equipment.id}-${i.type}`);
  }

  let best: NextEligibleItem | null = null;
  let bestTs = -Infinity;

  for (const ins of todays) {
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
