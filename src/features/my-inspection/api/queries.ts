import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteInspection,
  getMyInspections,
  type MyInspectionsOptions,
} from "./myInspectionApi";
import type { MyInspection } from "../type/types";

export const myInspectionKeys = {
  all: ["my-inspections"] as const,
  list: (opts: MyInspectionsOptions = {}) =>
    [
      ...myInspectionKeys.all,
      "list",
      { includeFinished: !!opts.includeFinished },
    ] as const,
};

export function useMyInspectionList(opts: MyInspectionsOptions = {}) {
  return useQuery({
    queryKey: myInspectionKeys.list(opts),
    queryFn: () => getMyInspections(opts),
  });
}

export function useDeleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: number) => deleteInspection(inspectionId),
    onSuccess: (_void, deletedId) => {
      // refetch 전에 사용자가 빠르게 navigate 해도 즉시 화면에서 사라지도록 캐시에서 제거.
      qc.setQueriesData<MyInspection[]>(
        { queryKey: myInspectionKeys.all },
        (prev) =>
          prev ? prev.filter((i) => i.inspectionId !== deletedId) : prev,
      );
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
    },
  });
}
