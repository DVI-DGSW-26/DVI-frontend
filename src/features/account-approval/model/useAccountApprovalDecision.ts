import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postAccountDecision } from "../api/accountApprovalApi";
import type { AccountApprovalDecision } from "../type/types";
import {
  completedAccountsQueryKey,
  pendingAccountsQueryKey,
} from "./useAccountApproval";

interface DecisionVariables {
  userId: number;
  decision: AccountApprovalDecision;
}

export function useAccountApprovalDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, decision }: DecisionVariables) =>
      postAccountDecision(userId, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingAccountsQueryKey });
      queryClient.invalidateQueries({ queryKey: completedAccountsQueryKey });
    },
  });
}
