import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createEquipmentReport,
  getEquipmentReport,
  getEquipmentReports,
} from "./equipmentReportApi";
import type { EquipmentReportListParams } from "./types";

export const equipmentReportKeys = {
  all: ["equipment-report"] as const,
  list: (params: EquipmentReportListParams) =>
    [...equipmentReportKeys.all, "list", params] as const,
  detail: (id: number) => [...equipmentReportKeys.all, "detail", id] as const,
};

// 최신순으로 20건씩. "더 보기" 로 다음 쪽을 이어 붙인다.
export function useEquipmentReportList(params: EquipmentReportListParams) {
  return useInfiniteQuery({
    queryKey: equipmentReportKeys.list(params),
    queryFn: ({ pageParam }) => getEquipmentReports(params, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasNext ? pages.length : undefined),
    // 신고는 현장에서 수시로 들어온다. 화면에 다시 들어오면 새로 받는다.
    refetchOnWindowFocus: true,
  });
}

export function useEquipmentReportDetail(id: number, enabled = true) {
  return useQuery({
    queryKey: equipmentReportKeys.detail(id),
    queryFn: () => getEquipmentReport(id),
    enabled,
    retry: false,
  });
}

export function useCreateEquipmentReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEquipmentReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentReportKeys.all }),
  });
}
