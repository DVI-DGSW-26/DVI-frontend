import type { Role } from "../../auth/type/types";
import type { UserDetailStatus } from "../api/types";

export const ROLE_LABEL: Record<Role, string> = {
  PRODUCTION: "생산 담당자",
  PRODUCTION_MANAGER: "생산 관리자",
  QUALITY: "품질 담당자",
  QUALITY_ADMIN: "품질 관리자",
  ADMIN: "통합 관리자",
};

export const DEPARTMENT_LABEL: Record<Role, string> = {
  PRODUCTION: "생산부",
  PRODUCTION_MANAGER: "생산부",
  QUALITY: "품질부",
  QUALITY_ADMIN: "품질부",
  ADMIN: "관리부",
};

export interface StatusBadgeStyle {
  label: string;
  color: string;
}

export const STATUS_BADGE: Record<UserDetailStatus, StatusBadgeStyle> = {
  ACTIVE: { label: "활성", color: "#22C55E" },
  INACTIVE: { label: "비활성", color: "#EF4444" },
  PENDING: { label: "대기중", color: "#F59E0B" },
  DELETED: { label: "삭제됨", color: "#A8A8A8" },
};
