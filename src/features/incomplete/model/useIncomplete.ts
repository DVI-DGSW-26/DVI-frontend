import { useQuery } from "@tanstack/react-query";
import { getIncomplete } from "../api/incompleteApi";
import { mockIncomplete } from "./mockIncomplete";

const USE_MOCK = true;

export const incompleteQueryKey = ["incomplete"] as const;

export function useIncomplete() {
  return useQuery({
    queryKey: incompleteQueryKey,
    queryFn: USE_MOCK
      ? () => Promise.resolve(mockIncomplete)
      : getIncomplete,
  });
}
