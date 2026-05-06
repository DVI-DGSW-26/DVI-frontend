import { useQuery } from "@tanstack/react-query";
import {
  getCompletedAccounts,
  getPendingAccounts,
} from "../api/accountApprovalApi";
import {
  mockCompletedAccounts,
  mockPendingAccounts,
} from "./mockAccountApproval";

const USE_MOCK = true;

export const pendingAccountsQueryKey = ["account-approval", "pending"] as const;
export const completedAccountsQueryKey = [
  "account-approval",
  "completed",
] as const;

export function usePendingAccounts() {
  return useQuery({
    queryKey: pendingAccountsQueryKey,
    queryFn: USE_MOCK
      ? () => Promise.resolve(mockPendingAccounts)
      : getPendingAccounts,
  });
}

export function useCompletedAccounts() {
  return useQuery({
    queryKey: completedAccountsQueryKey,
    queryFn: USE_MOCK
      ? () => Promise.resolve(mockCompletedAccounts)
      : getCompletedAccounts,
  });
}
