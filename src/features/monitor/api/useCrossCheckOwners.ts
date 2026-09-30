import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { crossCheckKeys, getAssignedCrossChecks } from "../../cross-check/api";

// 사람이 바뀌는 일이 잦지 않아 30초면 충분하다. 탭이 가려져도 계속 받는다.
const REFETCH_MS = 30_000;

/**
 * 시점별 순회검사 담당자 (자주검사 id → 이름).
 *
 * 모니터 스냅샷(SSE)의 checkerName 은 **진행중** 순회검사에만 있다. 이미 끝난 차수는
 * 스냅샷에서 빠지므로 벽 화면에서 이름이 사라졌다 — 끝난 차수까지 담당자를 들고 있는
 * 목록이 GET /cross-check/assigned 라 그걸로 메운다(AVAILABLE·IN_PROGRESS·COMPLETED·
 * PENDING_APPROVAL 이 함께 내려온다).
 *
 * 두 가지는 여전히 못 채운다 — 결재까지 승인된 건은 이 목록에서 빠지고, 이 API 는
 * 품질·관리자 권한 전용이라 생산 계정으로 띄운 화면에서는 403 이 난다. 둘 다 이름만
 * 비고 화면은 그대로 돌아야 하므로 실패해도 재시도하지 않는다.
 */
export function useCrossCheckOwners(): Map<number, string> {
  const { data } = useQuery({
    queryKey: crossCheckKeys.assigned([]),
    queryFn: () => getAssignedCrossChecks(),
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: true,
    staleTime: REFETCH_MS,
    retry: false,
  });

  return useMemo(() => {
    const owners = new Map<number, string>();
    for (const item of data ?? []) {
      const name = item.ownerName?.trim();
      if (name) owners.set(item.inspectionId, name);
    }
    return owners;
  }, [data]);
}
