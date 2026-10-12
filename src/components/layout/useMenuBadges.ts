import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthContext";
import { hasRole } from "../../features/auth/roles";
import {
  approvalKeys,
  getApprovalPendingCounts,
} from "../../features/approval/api/approvalApi";

/** 메뉴 옆에 붙일 대기 건수 — tabs.* labelKey 기준. 0 이거나 모르면 키가 없다. */
export type MenuBadges = Partial<Record<string, number>>;

// 메뉴는 늘 떠 있으니 자주 부르지 않는다 — 1분이면 "결재할 게 있다"를 알기엔 충분하다.
const BADGE_STALE_MS = 60 * 1000;

/**
 * 결재 메뉴의 대기 건수.
 *
 * "결재할 게 있다"는 말에 자주검사 미완료와 순회검사 결재 두 곳을 다 열어봐야 했다.
 * 메뉴에 건수를 붙여 어디부터 볼지 바로 알게 한다. 건수 전용 API(`/approval/pending-counts`)
 * 를 써서 목록을 받지 않는다. 순회검사는 결재 대기(PENDING_APPROVAL)만 센다.
 * 결재 처리(미완료 결정·순회검사 결정) 시 이 키도 무효화한다.
 */
export function useMenuBadges(): MenuBadges {
  const { user } = useAuth();
  const isApprover = hasRole(user?.role, ["QUALITY_ADMIN", "ADMIN"]);

  const counts = useQuery({
    queryKey: approvalKeys.pendingCounts,
    queryFn: getApprovalPendingCounts,
    enabled: isApprover,
    staleTime: BADGE_STALE_MS,
    refetchInterval: BADGE_STALE_MS,
  });

  if (!isApprover || !counts.data) return {};
  const badges: MenuBadges = {};
  if (counts.data.incomplete > 0)
    badges.approvalManagement = counts.data.incomplete;
  if (counts.data.crossCheck > 0)
    badges.crossCheckApproval = counts.data.crossCheck;
  return badges;
}
