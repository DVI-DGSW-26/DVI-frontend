import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { crossCheckKeys, getCrossCheckDetail } from "../../cross-check/api";

// 반려는 하루에 몇 건 나오는 값이라 넉넉하지만, 데이터가 이상할 때 요청이 폭주하지
// 않게 막아 둔다.
const MAX_LOOKUPS = 12;

/**
 * 순회검사 반려 사유 (순회검사 id → 사유).
 *
 * 모니터 스냅샷은 반려 여부만 알려주고 사유는 담지 않는다 — 반려된 건에 대해서만
 * 상세(GET /cross-check/{id})를 한 번씩 받아 온다. 이미 적힌 사유는 바뀌지 않으므로
 * 한 번 받으면 다시 받지 않는다.
 */
export function useCrossCheckReasons(
  crossCheckIds: number[],
): Map<number, string> {
  const ids = useMemo(
    () => crossCheckIds.slice(0, MAX_LOOKUPS),
    [crossCheckIds],
  );

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: crossCheckKeys.detail(id),
      queryFn: () => getCrossCheckDetail(id),
      staleTime: Infinity,
      gcTime: 30 * 60_000,
      retry: false,
    })),
  });

  return useMemo(() => {
    const map = new Map<number, string>();
    ids.forEach((id, i) => {
      const reason = results[i]?.data?.rejectReason?.trim();
      if (reason) map.set(id, reason);
    });
    return map;
  }, [ids, results]);
}
