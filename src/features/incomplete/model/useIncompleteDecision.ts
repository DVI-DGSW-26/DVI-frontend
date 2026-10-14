import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postIncompleteDecision } from "../api/incompleteApi";
import type { Decision } from "../type/types";
import { incompleteQueryKey } from "./useIncomplete";
import { approvalKeys } from "../../approval/api/approvalApi";

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
    // 여러 건 중 일부만 실패해도 이미 처리된 건은 목록에서 빠져야 한다 — 성공·실패 모두 갱신.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: incompleteQueryKey });
      queryClient.invalidateQueries({ queryKey: approvalKeys.pendingCounts });
    },
  });
}
