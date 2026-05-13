import { useQuery } from "@tanstack/react-query";
import { getMyInspections } from "./myInspectionApi";

export const myInspectionKeys = {
  all: ["my-inspections"] as const,
  list: () => [...myInspectionKeys.all, "list"] as const,
};

export function useMyInspectionList() {
  return useQuery({
    queryKey: myInspectionKeys.list(),
    queryFn: getMyInspections,
  });
}
