import type { Role } from "../../auth/type/types";
import type { UserDetailStatus } from "../api/types";

// 라벨은 i18n 키로 노출한다 — 렌더 시 t(key, { ns: "userSearch" })로 변환할 것.
// 역할(직책) 라벨은 별도 맵 없이 common:roles.* 키를 직접 사용한다.

export const DEPARTMENT_LABEL_KEY: Record<Role, string> = {
  PRODUCTION: "departments.production",
  PRODUCTION_MANAGER: "departments.production",
  QUALITY: "departments.quality",
  QUALITY_ADMIN: "departments.quality",
  ADMIN: "departments.admin",
  TEST: "departments.test",
};

export interface StatusBadgeStyle {
  labelKey: string;
  color: string;
}

export const STATUS_BADGE: Record<UserDetailStatus, StatusBadgeStyle> = {
  ACTIVE: { labelKey: "statusBadge.active", color: "#22C55E" },
  INACTIVE: { labelKey: "statusBadge.inactive", color: "#EF4444" },
  PENDING: { labelKey: "statusBadge.pending", color: "#F59E0B" },
  DELETED: { labelKey: "statusBadge.deleted", color: "#A8A8A8" },
};
