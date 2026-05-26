import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postIncompleteDecision } from "../api/incompleteApi";
import type { Decision } from "../type/types";
import { incompleteQueryKey } from "./useIncomplete";

interface DecisionVariables {
  inspectionIds: number[];
  decision: Decision;
}

export function useIncompleteDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inspectionIds, decision }: DecisionVariables) =>
      Promise.all(
        inspectionIds.map((id) => postIncompleteDecision(id, decision)),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incompleteQueryKey });
    },
  });
}
