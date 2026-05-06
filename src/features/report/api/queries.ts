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
  });
}

export function useReportDetail(reportId: number, enabled = true) {
  return useQuery({
    queryKey: reportKeys.detail(reportId),
    queryFn: () => getReportDetail(reportId),
    enabled,
  });
}
