import { useQuery } from "@tanstack/react-query";
import { getAllInspections } from "../../admin-inspection/api/adminInspectionApi";
import { adminInspectionKeys } from "../../admin-inspection/api";

// 벽 화면은 사람이 새로고침하지 않으므로 스스로 갱신해야 한다. 서버가 현황을 5초
// 주기로 확인하므로 10초면 체감 지연이 없고, 탭이 가려져도 계속 받는다.
const REFETCH_MS = 10_000;

/**
 * 오늘(KST) 전 작업자 자주검사 — 진행도 매트릭스의 원본 데이터.
 *
 * 관리자 화면과 같은 GET /inspection/all 을 쓰지만 캐시 정책이 다르다(공용 훅은
 * 폴링하지 않는다). 쿼리 키는 공유해 두 화면이 같은 캐시를 재사용한다.
 */
export function useTodayInspections(date: string) {
  return useQuery({
    queryKey: adminInspectionKeys.list({ date }),
    queryFn: () => getAllInspections({ date }),
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
}
