import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthContext";
import { hasRole } from "../../features/auth/roles";
import { crossCheckKeys, getPendingCrossChecks } from "../../features/cross-check/api";
import { getIncomplete } from "../../features/incomplete/api/incompleteApi";
import { incompleteQueryKey } from "../../features/incomplete/model/useIncomplete";

/** 메뉴 옆에 붙일 대기 건수 — tabs.* labelKey 기준. 0 이거나 모르면 키가 없다. */
export type MenuBadges = Partial<Record<string, number>>;

// 메뉴는 늘 떠 있으니 자주 부르지 않는다 — 1분이면 "결재할 게 있다"를 알기엔 충분하다.
const BADGE_STALE_MS = 60 * 1000;

/**
 * 결재 메뉴의 대기 건수.
 *
 * "결재할 게 있다"는 말에 자주검사 미완료와 순회검사 결재 두 곳을 다 열어봐야 했다.
 * 메뉴에 건수를 붙여 어디부터 볼지 바로 알게 한다. 서버에 건수 전용 API 가 없어
 * 기존 목록을 센다 — 결재 화면과 같은 쿼리 키라 그 화면에 들어가면 캐시를 같이 쓴다.
 * `/cross-check/pending` 은 작성 중·완료 건도 돌려주므로 결재 대기(PENDING_APPROVAL)만 센다.
 */
export function useMenuBadges(): MenuBadges {
  const { user } = useAuth();
  const isApprover = hasRole(user?.role, ["QUALITY_ADMIN", "ADMIN"]);

  const incomplete = useQuery({
    queryKey: incompleteQueryKey,
    queryFn: getIncomplete,
    enabled: isApprover,
    staleTime: BADGE_STALE_MS,
    refetchInterval: BADGE_STALE_MS,
  });
  const crossChecks = useQuery({
    queryKey: crossCheckKeys.pending([]),
    queryFn: () => getPendingCrossChecks([]),
    enabled: isApprover,
    staleTime: BADGE_STALE_MS,
    refetchInterval: BADGE_STALE_MS,
  });

  if (!isApprover) return {};
  const badges: MenuBadges = {};
  const incompleteCount = incomplete.data?.length ?? 0;
  const crossCheckCount =
    crossChecks.data?.filter((c) => c.status === "PENDING_APPROVAL").length ?? 0;
  if (incompleteCount > 0) badges.approvalManagement = incompleteCount;
  if (crossCheckCount > 0) badges.crossCheckApproval = crossCheckCount;
  return badges;
}
