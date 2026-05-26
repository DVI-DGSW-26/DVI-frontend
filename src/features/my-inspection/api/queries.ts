import { useQuery } from "@tanstack/react-query";
import {
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
};

export function useMyInspectionList(opts: MyInspectionsOptions = {}) {
  return useQuery({
    queryKey: myInspectionKeys.list(opts),
    queryFn: () => getMyInspections(opts),
  });
}
