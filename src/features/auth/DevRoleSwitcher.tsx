import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "./api";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "통합관리자",
  QUALITY_ADMIN: "품질관리자",
  PRODUCTION: "생산작업자",
  QUALITY: "품질담당자",
};

const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/",
  QUALITY_ADMIN: "/inspection-orders",
  PRODUCTION: "/",
  QUALITY: "/",
};

const ROLES: Role[] = ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "QUALITY"];

export default function DevRoleSwitcher() {
  if (!import.meta.env.DEV) return null;
  const { user, setDevRole } = useAuth();
  const navigate = useNavigate();

  const onChange = (role: Role) => {
    setDevRole(role);
    navigate(ROLE_HOME[role]);
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <span className="font-semibold text-gray-500">DEV role</span>
      <select
        value={user?.role ?? "ADMIN"}
        onChange={(e) => onChange(e.target.value as Role)}
        className="rounded border border-gray-300 bg-white px-2 py-1"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]} ({r})
          </option>
        ))}
      </select>
    </div>
  );
}
