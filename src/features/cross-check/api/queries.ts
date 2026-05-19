import { useQuery } from "@tanstack/react-query";
import {
  getAssignedCrossChecks,
  getMyCrossChecks,
  getMyDelegation,
} from "./crossCheckApi";

export const crossCheckKeys = {
  all: ["cross-check"] as const,
  my: (includeFinished = false) =>
    [...crossCheckKeys.all, "my", { includeFinished }] as const,
  assigned: () => [...crossCheckKeys.all, "assigned"] as const,
  delegationMe: () => ["delegation", "me"] as const,
};

export function useMyCrossChecks(includeFinished = false) {
  return useQuery({
    queryKey: crossCheckKeys.my(includeFinished),
    queryFn: () => getMyCrossChecks(includeFinished),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAssignedCrossChecks() {
  return useQuery({
    queryKey: crossCheckKeys.assigned(),
    queryFn: getAssignedCrossChecks,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useMyDelegation() {
  return useQuery({
    queryKey: crossCheckKeys.delegationMe(),
    queryFn: getMyDelegation,
  });
}
