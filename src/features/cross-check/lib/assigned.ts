import type { AssignedInspection } from "../api";

// "미처리" 의 정의 — 지금 바로 시작할 수 있는 건.
// 이미 누군가(남이든 본인이든) 시작한 IN_PROGRESS 건은 진행중이지 미처리가 아니다.
// 목록에는 남의 진행중 건이 비활성 카드로 보이지만, 카운트에서는 제외한다.
export function isUnprocessed(item: AssignedInspection): boolean {
  return item.status !== "IN_PROGRESS";
}

export function countUnprocessed(items: AssignedInspection[]): number {
  return items.filter(isUnprocessed).length;
}
