import type { NotificationResponse } from "../api/types";

// 알림 클릭 시 이동할 경로 결정.
// backend 가 보내는 linkUrl 만 믿으면 (1) cross-check 가 아직 생성 안 된 시점에 그
// id 로 라우팅돼 "정보 없음" 화면이 뜨거나 (2) 사용자 role 이 해당 경로에 접근 권한이
// 없어 RouteGuard 가 "/" 로 리다이렉트하거나 빈 화면이 뜨는 케이스가 있다.
// type 별로 안전한 기본값을 먼저 잡고, 필요할 때만 linkUrl 을 따른다.
export function resolveNotificationLink(n: NotificationResponse): string {
  switch (n.type) {
    case "INSPECTION_COMPLETED":
      // 자주검사 완료 → 순회검사자 알림. 이 시점에는 cross-check 가 아직 생성되지
      // 않아 linkUrl 의 id 로 detail 조회하면 404. 할당 대기 목록으로 보내서
      // 거기서 카드 클릭하면 POST /cross-check 가 일어나도록 한다.
      return "/cross-checks";

    case "CROSS_CHECK_PENDING_APPROVAL":
      // 품질관리자에게 결재 요청 알림. 결재 대기 목록으로.
      return "/cross-check-approval";

    case "CROSS_CHECK_APPROVED":
      // 본인 순회검사 결과. linkUrl 이 /reports/{id} 면 그 보고서로, 아니면 결재 이력 탭.
      return n.linkUrl ?? "/cross-checks?tab=history";

    case "CROSS_CHECK_REJECTED":
      // 반려 알림 — 홈에 "반려된 검사" 카드가 노출되므로 그쪽으로 보내서
      // "수정하기" 버튼으로 reopen → 측정 흐름을 사용자가 명시적으로 시작하게 한다.
      return "/";

    case "INSPECTION_REMINDER":
      // 생산자에게 검사 시작 시점 알림.
      return n.linkUrl ?? "/inspections";

    case "INSPECTION_PRODUCTION_OFFLINE":
      // 작업자 오프라인 알림 — 관리자에게. 별도 화면 없으면 홈.
      return n.linkUrl ?? "/";

    case "DELEGATION_GRANTED":
    case "DELEGATION_REVOKED":
      // 권한 위임 변경 — 홈으로.
      return "/";

    case "INCOMPLETE_REQUESTED":
    case "INCOMPLETE_APPROVED":
    case "INCOMPLETE_REJECTED":
      // 미완료 결재 관련. linkUrl 있으면 따르고, 없으면 검사이력.
      return n.linkUrl ?? "/inspections";

    default:
      // 미매핑 type — linkUrl 있으면 시도, 없으면 알림 목록.
      return n.linkUrl ?? "/notifications";
  }
}
