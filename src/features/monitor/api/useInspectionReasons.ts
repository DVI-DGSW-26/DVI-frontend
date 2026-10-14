import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getInspectionDetail, inspectionKeys } from "../../inspection/api";

// 한 화면에서 사유를 캐올 건너뜀 칸의 상한. 하루에 몇 건 나오는 값이라 넉넉하지만,
// 데이터가 이상할 때 요청이 폭주하지 않게 막아 둔다.
const MAX_LOOKUPS = 24;
// 사유가 아직 없는 칸을 다시 확인하는 간격.
const REASON_RECHECK_MS = 60_000;

type ReasonData = { incompleteReason?: string | null } | undefined;
type ReasonQuery = { state: { data: ReasonData } };

function hasReason(data: ReasonData): boolean {
  return !!data?.incompleteReason?.trim();
}

/**
 * 자주검사에 적힌 사유 (자주검사 id → 사유).
 *
 * 건너뜀과 미완료가 같은 필드(incompleteReason)를 쓴다 — 목록 API(GET /inspection/all)
 * 는 이 값을 내려주지 않아, 사유가 필요한 칸에 대해서만 상세(GET /inspection/{id})를
 * 한 번씩 받아 온다. 사유가 적힌 기록은 더 바뀌지 않으므로 다시 받지 않는다. 사유가
 * 비어 있으면 순회검사자가 나중에 대신 적을 수 있어(미검사 사유) 1분마다 다시 받는다.
 *
 * 사유가 비어 있으면 지도에 넣지 않는다 — 호출부는 "사유 없음"으로 그린다.
 */
export function useInspectionReasons(
  inspectionIds: number[],
): Map<number, string> {
  const ids = useMemo(
    () => inspectionIds.slice(0, MAX_LOOKUPS),
    [inspectionIds],
  );

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: inspectionKeys.detail(id),
      queryFn: () => getInspectionDetail(id),
      staleTime: (q: ReasonQuery) =>
        hasReason(q.state.data) ? Infinity : REASON_RECHECK_MS,
      refetchInterval: (q: ReasonQuery) =>
        hasReason(q.state.data) ? false : REASON_RECHECK_MS,
      gcTime: 30 * 60_000,
    })),
  });

  return useMemo(() => {
    const map = new Map<number, string>();
    ids.forEach((id, i) => {
      const reason = results[i]?.data?.incompleteReason?.trim();
      if (reason) map.set(id, reason);
    });
    return map;
  }, [ids, results]);
}
