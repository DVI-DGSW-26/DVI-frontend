import type { Role } from "../../auth/api";

export interface DashboardStatsResponse {
  pendingUserCount: number;
  totalUserCount: number;
  loggedInTodayCount: number;
}

export type DashboardUserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "DELETED"
  | "PENDING";

export interface DashboardUser {
  id: number;
  loginId: string;
  name: string;
  role: Role;
  effectiveRole: Role;
  status: DashboardUserStatus;
  online: boolean;
  createdAt: string;
}
