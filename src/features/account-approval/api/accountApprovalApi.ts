import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  AccountApprovalDecision,
  CompletedAccount,
  PendingAccount,
} from "../type/types";

export async function getPendingAccounts(): Promise<PendingAccount[]> {
  const { data } = await http.get<ApiResponse<PendingAccount[]>>(
    "/admin/accounts/pending",
  );
  return data.data ?? [];
}

export async function getCompletedAccounts(): Promise<CompletedAccount[]> {
  const { data } = await http.get<ApiResponse<CompletedAccount[]>>(
    "/admin/accounts/completed",
  );
  return data.data ?? [];
}

export async function postAccountDecision(
  userId: number,
  decision: AccountApprovalDecision,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/admin/accounts/${userId}/decision`,
    { decision },
  );
}
