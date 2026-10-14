import { useQuery } from "@tanstack/react-query";
import { getMonitorSchedule } from "./monitorApi";

// 칸 구성은 작업지시가 바뀔 때만 달라지고 칸 상태는 /inspection/all 에서 따로 받으므로
// 자주 받을 필요가 없다. SSE schedule 이벤트도 있지만 스트림 훅을 건드리지 않으려고
// REST 로 받는다.
const REFETCH_MS = 30_000;

/**
 * 오늘 작업지시별 슬롯 칸 — 현황판 줄의 칸 구성 원본.
 *
 * 실패해도 현황판은 공정 기본 슬롯으로 그린다(buildProgressRows 참고).
 */
export function useMonitorSchedule() {
  return useQuery({
    queryKey: ["monitor", "schedule"],
    queryFn: ({ signal }) => getMonitorSchedule(signal),
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
}
