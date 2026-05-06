export type AccountApprovalDecision = "APPROVE" | "REJECT";
export type AccountApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PendingAccount {
  userId: number;
  name: string;
  department: string;
  process: string;
  role: string;
  requestedAt: string;
  avatarUrl?: string | null;
}

export interface CompletedAccount extends PendingAccount {
  status: Exclude<AccountApprovalStatus, "PENDING">;
  decidedAt: string;
}
