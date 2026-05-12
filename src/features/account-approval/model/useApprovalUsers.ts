import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveUser, getAllUsers } from "../api/userApi";

export const approvalUsersQueryKey = ["account-approval", "users"] as const;

export function useApprovalUsers() {
  return useQuery({
    queryKey: approvalUsersQueryKey,
    queryFn: getAllUsers,
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => approveUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalUsersQueryKey });
    },
  });
}
