import { useQuery } from "@tanstack/react-query";
import { getMyCrossChecks, getMyDelegation } from "./crossCheckApi";

export const crossCheckKeys = {
  all: ["cross-check"] as const,
  my: () => [...crossCheckKeys.all, "my"] as const,
  delegationMe: () => ["delegation", "me"] as const,
};

export function useMyCrossChecks() {
  return useQuery({
    queryKey: crossCheckKeys.my(),
    queryFn: getMyCrossChecks,
  });
}

export function useMyDelegation() {
  return useQuery({
    queryKey: crossCheckKeys.delegationMe(),
    queryFn: getMyDelegation,
  });
}
