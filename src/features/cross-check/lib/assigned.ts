import type { AssignedInspection } from "../api";

// 담당자가 취소(release)해서 checker 가 비워진 IN_PROGRESS 건.
// 서버는 이걸 ownerName=null 인 IN_PROGRESS 로 내려주며, 다른 검사자가 같은
// inspectionId 로 POST /cross-check 를 호출하면 측정값을 유지한 채 이어받는다.
export function isTakeoverable(item: AssignedInspection): boolean {
  return item.status === "IN_PROGRESS" && item.ownerName == null;
}

// "미처리" 의 정의 — 지금 바로 시작(또는 이어받기)할 수 있는 건.
// 남이 진행 중인 IN_PROGRESS 는 미처리가 아니지만(비활성 카드), 취소로 담당자가
// 빠진(ownerName=null) IN_PROGRESS 는 아무도 안 하고 있으므로 미처리로 센다.
export function isUnprocessed(item: AssignedInspection): boolean {
  return item.status !== "IN_PROGRESS" || isTakeoverable(item);
}

export function countUnprocessed(items: AssignedInspection[]): number {
  return items.filter(isUnprocessed).length;
}
