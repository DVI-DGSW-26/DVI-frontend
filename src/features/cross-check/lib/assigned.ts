import type { AssignedInspection } from "../api";

// 담당자가 취소(release)해서 checker 가 비워진 IN_PROGRESS 건.
// 서버는 이걸 ownerName=null 인 IN_PROGRESS 로 내려주며, 다른 검사자가 같은
// inspectionId 로 POST /cross-check 를 호출하면 측정값을 유지한 채 이어받는다.
export function isTakeoverable(item: AssignedInspection): boolean {
  return item.status === "IN_PROGRESS" && item.ownerName == null;
}

// 순회검사가 이미 끝난 건. 예전 서버는 이런 건도 IN_PROGRESS 로 내려줬지만, 이제
// 차수 완료(COMPLETED) / 결재 대기(PENDING_APPROVAL) 로 구분해서 내려준다.
// 배정 목록에는 남겨 배지로 결과만 보여주고, 새로 시작하지는 못하게 한다.
export function isFinished(item: AssignedInspection): boolean {
  return item.status === "COMPLETED" || item.status === "PENDING_APPROVAL";
}

// "미처리" 의 정의 — 지금 바로 시작(또는 이어받기)할 수 있는 건.
// 남이 진행 중인 IN_PROGRESS 는 미처리가 아니지만(비활성 카드), 취소로 담당자가
// 빠진(ownerName=null) IN_PROGRESS 는 아무도 안 하고 있으므로 미처리로 센다.
// 이미 끝난 건(COMPLETED/PENDING_APPROVAL)은 당연히 미처리가 아니다.
export function isUnprocessed(item: AssignedInspection): boolean {
  if (isFinished(item)) return false;
  return item.status !== "IN_PROGRESS" || isTakeoverable(item);
}

export function countUnprocessed(items: AssignedInspection[]): number {
  return items.filter(isUnprocessed).length;
}

// 배정 목록 카드에 붙는 상태 배지. 색은 결재 목록(CrossCheckApprovalPage)의
// STATUS_META 와 맞춰 두 화면에서 같은 상태가 같은 색으로 보이게 한다.
export interface AssignedStatusBadge {
  label: string;
  // 제목 옆 알약 배지용 (배경 + 글자색).
  className: string;
  // 카드 오른쪽 경과시간 자리에 들어가는 텍스트용 (글자색만).
  textClassName: string;
}

export const ASSIGNED_STATUS_BADGE: Record<
  "COMPLETED" | "PENDING_APPROVAL",
  AssignedStatusBadge
> = {
  COMPLETED: {
    label: "차수 완료",
    className: "bg-[#ECFEFF] text-[#0E7490]",
    textClassName: "text-[#0E7490]",
  },
  PENDING_APPROVAL: {
    label: "결재 대기",
    className: "bg-[#FEF3C7] text-[#B45309]",
    textClassName: "text-[#B45309]",
  },
};

// 카드에 표시할 배지 정보. 끝난 건이 아니면 null.
export function finishedBadge(
  item: AssignedInspection,
): AssignedStatusBadge | null {
  if (item.status === "COMPLETED") return ASSIGNED_STATUS_BADGE.COMPLETED;
  if (item.status === "PENDING_APPROVAL")
    return ASSIGNED_STATUS_BADGE.PENDING_APPROVAL;
  return null;
}
