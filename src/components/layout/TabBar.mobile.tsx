import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../features/auth/api";

type TabItem = {
  // layout 네임스페이스 tabs.* 키
  labelKey: string;
  to: string;
  icon: string;
  roles: Role[];
  iconSize?: number;
  // 현재 pathname 으로 활성화 여부를 커스텀 판정. 미지정 시 NavLink end-match.
  activeMatch?: (pathname: string) => boolean;
};

const TABS: TabItem[] = [
  { labelKey: "dashboard", to: "/", icon: "flowbite:home-solid", roles: ["ADMIN"] },
  { labelKey: "reports", to: "/reports", icon: "basil:document-solid", roles: ["ADMIN"] },

  { labelKey: "approvalManagement", to: "/approval-management", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_ADMIN", "ADMIN"] },
  { labelKey: "qmReports", to: "/qm-reports", icon: "basil:document-solid", roles: ["QUALITY_ADMIN"] },

  { labelKey: "home", to: "/", icon: "flowbite:home-solid", roles: ["PRODUCTION"], iconSize: 34 },
  { labelKey: "inspectionHistory", to: "/inspections", icon: "icon-park-outline:big-clock", roles: ["PRODUCTION"] },
  {
    labelKey: "scan",
    to: "/scan",
    icon: "carbon:scan-alt",
    roles: ["PRODUCTION"],
    // 작업 중인 측정/결과 페이지에서도 이 탭이 활성화 보이도록.
    activeMatch: (p) =>
      p === "/scan" || p.startsWith("/inspection/"),
  },

  { labelKey: "home", to: "/", icon: "flowbite:home-solid", roles: ["QUALITY"], iconSize: 34 },
  { labelKey: "crossChecks", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["QUALITY", "ADMIN"] },
  { labelKey: "crossCheckApproval", to: "/cross-check-approval", icon: "mdi:shield-check-outline", roles: ["QUALITY_ADMIN", "ADMIN"] },

  { labelKey: "adminInspections", to: "/admin-inspections", icon: "mdi:clipboard-remove-outline", roles: ["ADMIN"] },
  { labelKey: "products", to: "/products", icon: "mdi:cube", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { labelKey: "equipment", to: "/equipment", icon: "mdi:factory", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { labelKey: "customers", to: "/customers", icon: "mdi:office-building", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { labelKey: "processes", to: "/processes", icon: "mdi:cog-transfer-outline", roles: ["ADMIN", "QUALITY_ADMIN"] },

  { labelKey: "inspectionOrders", to: "/inspection-orders", icon: "mdi:clipboard-text-outline", roles: ["PRODUCTION_MANAGER"], iconSize: 34 },
  { labelKey: "myOrders", to: "/my-orders", icon: "mdi:clipboard-list-outline", roles: ["PRODUCTION"] },

  { labelKey: "myPage", to: "/my-page", icon: "mdi:account-circle", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "PRODUCTION_MANAGER", "QUALITY"] },
];

const TabBarMobile = () => {
  const { user } = useAuth();
  const { t } = useTranslation("layout");
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
            key={`${tab.labelKey}-${tab.to}`}
            to={tab.to}
            end
            aria-label={t(`tabs.${tab.labelKey}`)}
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