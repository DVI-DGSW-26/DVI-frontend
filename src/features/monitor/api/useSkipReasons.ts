import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getInspectionDetail, inspectionKeys } from "../../inspection/api";

// 한 화면에서 사유를 캐올 건너뜀 칸의 상한. 하루에 몇 건 나오는 값이라 넉넉하지만,
// 데이터가 이상할 때 요청이 폭주하지 않게 막아 둔다.
const MAX_LOOKUPS = 24;

/**
 * 건너뛴 시점의 사유.
 *
 * 목록 API(GET /inspection/all)는 사유를 내려주지 않는다 — 상세(GET /inspection/{id})
 * 를 건너뛴 칸에 대해서만 한 번씩 받아 온다. 건너뜀 기록은 더 바뀌지 않으므로 한 번
 * 받으면 다시 받지 않는다(staleTime 무한).
 *
 * 사유가 비어 있으면 지도에 넣지 않는다 — 호출부는 "사유 없음"으로 그린다.
 */
export function useSkipReasons(inspectionIds: number[]): Map<number, string> {
  const ids = useMemo(
    () => inspectionIds.slice(0, MAX_LOOKUPS),
    [inspectionIds],
  );

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: inspectionKeys.detail(id),
      queryFn: () => getInspectionDetail(id),
      staleTime: Infinity,
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
