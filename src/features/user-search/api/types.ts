import type { Role } from "../../auth/type/types";

export type UserDetailStatus = "ACTIVE" | "INACTIVE" | "DELETED" | "PENDING";

export interface UserDetail {
  id: number;
  loginId: string;
  name: string;
  role: Role;
  effectiveRole: Role;
  status: UserDetailStatus;
  online: boolean;
  createdAt: string;
}
