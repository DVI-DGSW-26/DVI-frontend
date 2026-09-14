import { useQuery } from "@tanstack/react-query";
import { getInspectionDetail, inspectionKeys } from "../../inspection/api";

// 벽 화면은 사람이 새로고침하지 않는다. 작업자가 지금 값을 찍어 넣는 중인 검사를
// 보여주는 화면이라 5초면 "옆에서 보고 있는" 느낌이 나고, 탭이 가려져도 계속 받는다.
const REFETCH_MS = 5000;

/**
 * 페이지2(검사 상세)가 쓰는 GET /inspection/{id}.
 *
 * 이 페이지 전용 신규 API 는 없다 — 이미 있는 상세 조회를 그대로 쓴다. 다만 캐시
 * 정책이 다르다(작업 화면용 훅은 폴링하지 않는다). 쿼리 키는 공유해 같은 검사를
 * 다른 화면에서 열었을 때 캐시를 재사용한다.
 *
 * 화면에 걸린 한 건만 받는다 — 진행중 검사가 스무 건이어도 요청은 5초에 한 번이다.
 */
export function useMonitorInspectionDetail(inspectionId: number | undefined) {
  return useQuery({
    queryKey: inspectionKeys.detail(inspectionId as number),
    queryFn: () => getInspectionDetail(inspectionId as number),
    enabled:
      typeof inspectionId === "number" &&
      Number.isFinite(inspectionId) &&
      inspectionId > 0,
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
    // 순환하다 같은 검사로 돌아왔을 때 빈 화면부터 그리지 않도록 잠깐 남겨 둔다.
    gcTime: 60_000,
  });
}
