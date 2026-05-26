import { useQuery } from "@tanstack/react-query";
import { getIncomplete } from "../api/incompleteApi";

export const incompleteQueryKey = ["incomplete"] as const;

export function useIncomplete() {
  return useQuery({
    queryKey: incompleteQueryKey,
    queryFn: getIncomplete,
  });
}
