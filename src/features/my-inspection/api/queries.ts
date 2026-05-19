import { useQuery } from "@tanstack/react-query";
import {
  getAssignedInspections,
  getMyInspections,
  type MyInspectionsOptions,
} from "./myInspectionApi";

export const myInspectionKeys = {
  all: ["my-inspections"] as const,
  list: (opts: MyInspectionsOptions = {}) =>
    [
      ...myInspectionKeys.all,
      "list",
      { includeFinished: !!opts.includeFinished },
    ] as const,
  assigned: () => [...myInspectionKeys.all, "assigned"] as const,
};

export function useMyInspectionList(opts: MyInspectionsOptions = {}) {
  return useQuery({
    queryKey: myInspectionKeys.list(opts),
    queryFn: () => getMyInspections(opts),
  });
}

export function useMyAssignedInspections() {
  return useQuery({
    queryKey: myInspectionKeys.assigned(),
    queryFn: getAssignedInspections,
  });
}
