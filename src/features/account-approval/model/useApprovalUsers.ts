import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveUser, getAllUsers } from "../api/userApi";
import { dashboardKeys } from "../../dashboard/api/queries";

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
      // 대시보드 "빠른 승인 대기"도 같은 사용자 목록을 따로 캐시한다.
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
