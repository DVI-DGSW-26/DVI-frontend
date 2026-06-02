import { useQuery } from "@tanstack/react-query";
import { getReportDetail, getReports } from "./reportApi";

export const reportKeys = {
  all: ["reports"] as const,
  list: () => [...reportKeys.all, "list"] as const,
  detail: (id: number) => [...reportKeys.all, "detail", id] as const,
};

export function useReportList() {
  return useQuery({
    queryKey: reportKeys.list(),
    queryFn: getReports,
    // 보고서 페이지로 들어올 때마다 최신 발행분을 받아오도록.
    // (전역 staleTime 60s + refetchOnWindowFocus:false 라서, 이게 없으면
    // 다른 화면에서 승인 후 돌아와도 캐시된 stale 목록이 그대로 보임.)
    refetchOnMount: "always",
  });
}

export function useReportDetail(reportId: number, enabled = true) {
  return useQuery({
    queryKey: reportKeys.detail(reportId),
    queryFn: () => getReportDetail(reportId),
    enabled,
  });
}
