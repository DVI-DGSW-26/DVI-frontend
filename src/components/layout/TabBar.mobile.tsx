import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../features/auth/api";

type TabItem = {
  label: string;
  to: string;
  icon: string;
  roles: Role[];
  iconSize?: number;
};

const TABS: TabItem[] = [
  { label: "대시보드", to: "/", icon: "flowbite:home-solid", roles: ["ADMIN"] },
  { label: "사용자 검색", to: "/userSearch", icon: "mdi:people", roles: ["ADMIN"] },
  { label: "가입승인", to: "/approval", icon: "fluent:shield-task-48-filled", roles: ["ADMIN"] },
  { label: "검사보고서", to: "/reports", icon: "basil:document-solid", roles: ["ADMIN"] },

  { label: "검사지시관리", to: "/inspection-orders", icon: "mdi:clipboard-text", roles: ["QUALITY_ADMIN"] },
  { label: "승인관리", to: "/approval-management", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_ADMIN"] },
  { label: "보고서", to: "/qm-reports", icon: "basil:document-solid", roles: ["QUALITY_ADMIN"] },
  { label: "제품관리", to: "/products", icon: "mdi:cube", roles: ["QUALITY_ADMIN"] },
  { label: "설비관리", to: "/equipment", icon: "mdi:factory", roles: ["QUALITY_ADMIN"] },
  { label: "고객사 관리", to: "/customers", icon: "mdi:office-building", roles: ["QUALITY_ADMIN"] },

  { label: "홈", to: "/", icon: "flowbite:home-solid", roles: ["PRODUCTION"], iconSize: 34 },
  { label: "검사이력", to: "/inspections", icon: "icon-park-outline:big-clock", roles: ["PRODUCTION"] },
  { label: "스캔", to: "/scan", icon: "carbon:scan-alt", roles: ["PRODUCTION"] },

  { label: "홈", to: "/", icon: "flowbite:home-solid", roles: ["QUALITY"], iconSize: 34 },
  { label: "품질 시스템 현황", to: "/quality-status", icon: "mdi:chart-line", roles: ["QUALITY"] },
  { label: "순회검사 대기", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["QUALITY"] },
];

const TabBarMobile = () => {
  const { user } = useAuth();

  const visibleTabs = user
    ? TABS.filter((tab) => tab.roles.includes(user.role))
    : [];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-[#E5E7EB] bg-white">
      {visibleTabs.map((tab) => (
        <NavLink
          key={`${tab.label}-${tab.to}`}
          to={tab.to}
          end
          aria-label={tab.label}
          className={({ isActive }) =>
            `flex flex-1 items-center justify-center transition-colors ${
              isActive ? "text-[#931B82]" : "text-[#A8A8A8]"
            }`
          }
        >
          <Icon
            icon={tab.icon}
            width={tab.iconSize ?? 28}
            height={tab.iconSize ?? 28}
          />
        </NavLink>
      ))}
    </nav>
  );
};

export default TabBarMobile;