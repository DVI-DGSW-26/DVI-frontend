import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteInspectionAsAdmin,
  getAllInspections,
} from "./adminInspectionApi";
import type { AdminInspection, AdminInspectionFilter } from "./types";

export const adminInspectionKeys = {
  all: ["admin-inspections"] as const,
  list: (filter: AdminInspectionFilter = {}) =>
    [
      ...adminInspectionKeys.all,
      "list",
      { status: filter.status ?? null, date: filter.date ?? null },
    ] as const,
};

export function useAdminInspectionList(filter: AdminInspectionFilter = {}) {
  return useQuery({
    queryKey: adminInspectionKeys.list(filter),
    queryFn: () => getAllInspections(filter),
  });
}

export function useAdminDeleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: number) => deleteInspectionAsAdmin(inspectionId),
    onSuccess: (_void, deletedId) => {
      // refetch 전에 즉시 화면에서 사라지도록 캐시에서 먼저 제거.
      qc.setQueriesData<AdminInspection[]>(
        { queryKey: adminInspectionKeys.all },
        (prev) =>
          prev ? prev.filter((i) => i.inspectionId !== deletedId) : prev,
      );
      qc.invalidateQueries({ queryKey: adminInspectionKeys.all });
    },
  });
}
