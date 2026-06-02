import { NavLink, Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import Logo from "../../assets/Logo.svg";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../features/auth/api";

type TabItem = {
  label: string;
  to: string;
  icon: string;
  roles: Role[];
};

const TABS: TabItem[] = [
  { label: "대시보드", to: "/", icon: "flowbite:home-solid", roles: ["ADMIN"] },
  { label: "사용자 검색", to: "/userSearch", icon: "mdi:people", roles: ["ADMIN"] },
  { label: "가입승인", to: "/approval", icon: "fluent:shield-task-48-filled", roles: ["ADMIN"] },
  { label: "검사보고서", to: "/reports", icon: "basil:document-solid", roles: ["ADMIN"] },
  { label: "검사지시관리", to: "/inspection-orders", icon: "mdi:clipboard-text", roles: ["QUALITY_ADMIN"] },
  { label: "승인관리", to: "/approval-management", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_ADMIN"] },
  { label: "보고서", to: "/qm-reports", icon: "basil:document-solid", roles: ["QUALITY_ADMIN"] },
  { label: "순회검사 결재", to: "/cross-check-approval", icon: "mdi:shield-check-outline", roles: ["QUALITY_ADMIN", "ADMIN"] },
  { label: "순회검사 대기", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["ADMIN"] },
  { label: "품질 시스템 현황", to: "/quality-status", icon: "mdi:chart-line", roles: ["ADMIN"] },
  { label: "제품관리", to: "/products", icon: "mdi:cube", roles: ["ADMIN"] },
  { label: "설비관리", to: "/equipment", icon: "mdi:factory", roles: ["ADMIN"] },
  { label: "고객사 관리", to: "/customers", icon: "mdi:office-building", roles: ["ADMIN"] },
  { label: "마이페이지", to: "/my-page", icon: "mdi:account-circle", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "QUALITY"] },
];

const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard",
  QUALITY_ADMIN: "/cross-check-approval",
  PRODUCTION: "/",
  QUALITY: "/",
};

const TabBarWeb = () => {
  const { user } = useAuth();
  const visibleTabs = user
    ? TABS.filter((tab) => tab.roles.includes(user.role))
    : [];
  const homePath = user ? ROLE_HOME[user.role] : "/";

  return (
  <aside className="flex h-screen w-60 flex-col bg-white">
    <div className="flex items-center px-4 py-8 text-lg font-bold">
      <Link to={homePath} aria-label="홈으로 이동">
        <img src={Logo} className="w-14 xl:w-37 cursor-pointer" />
      </Link>
    </div>

    <nav className="flex flex-1 flex-col gap-1 w-full px-4">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg w-full py-4 pl-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[#F3E8F7] text-[#931B82]"
                : "text-black hover:text-[#931B82]"
            }`
          }
        >
          <Icon icon={tab.icon} width={20} height={20} />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);
};

export default TabBarWeb;
