import { useAuth } from "../../auth/AuthContext";
import { hasRole } from "../../auth/roles";

/** 설비 신고(POST /equipment-report)를 할 수 있는 역할. */
export function useCanReportEquipment(): boolean {
  const { user } = useAuth();
  return hasRole(user?.role, ["PRODUCTION", "QUALITY"]);
}
