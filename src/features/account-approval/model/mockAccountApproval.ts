import type { CompletedAccount, PendingAccount } from "../type/types";

export const mockPendingAccounts: PendingAccount[] = [
  {
    userId: 1,
    name: "박세희",
    department: "품질부",
    process: "압출공정",
    role: "품질관리자",
    requestedAt: "2025-07-06",
  },
  {
    userId: 2,
    name: "박세희",
    department: "품질부",
    process: "압출공정",
    role: "품질관리자",
    requestedAt: "2025-07-06",
  },
  {
    userId: 3,
    name: "박세희",
    department: "품질부",
    process: "압출공정",
    role: "품질관리자",
    requestedAt: "2025-07-06",
  },
];

export const mockCompletedAccounts: CompletedAccount[] = [
  {
    userId: 11,
    name: "박세희",
    department: "품질부",
    process: "압출공정",
    role: "품질관리자",
    requestedAt: "2025-07-06",
    decidedAt: "2025-12-08",
    status: "APPROVED",
  },
  {
    userId: 12,
    name: "박세희",
    department: "품질부",
    process: "압출공정",
    role: "품질관리자",
    requestedAt: "2025-05-27",
    decidedAt: "2025-07-06",
    status: "APPROVED",
  },
];
