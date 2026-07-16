import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../features/auth/api";

type TabItem = {
  label: string;
  to: string;
  icon: string;
  roles: Role[];
  iconSize?: number;
  // 현재 pathname 으로 활성화 여부를 커스텀 판정. 미지정 시 NavLink end-match.
  activeMatch?: (pathname: string) => boolean;
};

const TABS: TabItem[] = [
  { label: "대시보드", to: "/", icon: "flowbite:home-solid", roles: ["ADMIN"] },
  { label: "검사보고서", to: "/reports", icon: "basil:document-solid", roles: ["ADMIN"] },

  { label: "승인관리", to: "/approval-management", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_ADMIN", "ADMIN"] },
  { label: "보고서", to: "/qm-reports", icon: "basil:document-solid", roles: ["QUALITY_ADMIN"] },

  { label: "홈", to: "/", icon: "flowbite:home-solid", roles: ["PRODUCTION"], iconSize: 34 },
  { label: "검사이력", to: "/inspections", icon: "icon-park-outline:big-clock", roles: ["PRODUCTION"] },
  {
    label: "스캔",
    to: "/scan",
    icon: "carbon:scan-alt",
    roles: ["PRODUCTION"],
    // 작업 중인 측정/결과 페이지에서도 이 탭이 활성화 보이도록.
    activeMatch: (p) =>
      p === "/scan" ||
      p === "/start-inspection" ||
      p.startsWith("/inspection/"),
  },

  { label: "홈", to: "/", icon: "flowbite:home-solid", roles: ["QUALITY"], iconSize: 34 },
  { label: "순회검사 현황", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["QUALITY", "ADMIN"] },
  { label: "순회검사 결재", to: "/cross-check-approval", icon: "mdi:shield-check-outline", roles: ["QUALITY_ADMIN", "ADMIN"] },

  { label: "자주검사 관리", to: "/admin-inspections", icon: "mdi:clipboard-remove-outline", roles: ["ADMIN"] },
  { label: "제품관리", to: "/products", icon: "mdi:cube", roles: ["ADMIN"] },
  { label: "설비관리", to: "/equipment", icon: "mdi:factory", roles: ["ADMIN"] },
  { label: "고객사 관리", to: "/customers", icon: "mdi:office-building", roles: ["ADMIN"] },

  { label: "검사지시", to: "/inspection-orders", icon: "mdi:clipboard-text-outline", roles: ["PRODUCTION_MANAGER"], iconSize: 34 },
  { label: "내 검사지시", to: "/my-orders", icon: "mdi:clipboard-list-outline", roles: ["PRODUCTION"] },

  { label: "마이페이지", to: "/my-page", icon: "mdi:account-circle", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "PRODUCTION_MANAGER", "QUALITY"] },
];

const TabBarMobile = () => {
  const { user } = useAuth();
  const location = useLocation();

  const visibleTabs = user
    ? TABS.filter((tab) => tab.roles.includes(user.role))
    : [];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-[#E5E7EB] bg-white">
      {visibleTabs.map((tab) => {
        const customActive = tab.activeMatch?.(location.pathname);
        return (
          <NavLink
            key={`${tab.label}-${tab.to}`}
            to={tab.to}
            end
            aria-label={tab.label}
            className={({ isActive: navActive }) => {
              const isActive = customActive ?? navActive;
              return `flex flex-1 items-center justify-center transition-colors ${
                isActive ? "text-[#931B82]" : "text-[#A8A8A8]"
              }`;
            }}
          >
            <Icon
              icon={tab.icon}
              width={tab.iconSize ?? 28}
              height={tab.iconSize ?? 28}
            />
          </NavLink>
        );
      })}
    </nav>
  );
};

export default TabBarMobile;