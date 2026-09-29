import { NavLink, Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import Logo from "../../assets/Logo.svg";
import { useAuth } from "../../features/auth/AuthContext";
import { ROLE_HOME } from "../../features/auth/constants";
import type { Role } from "../../features/auth/api";

type TabItem = {
  // layout 네임스페이스 tabs.* 키
  labelKey: string;
  to: string;
  icon: string;
  roles: Role[];
};

const TABS: TabItem[] = [
  { labelKey: "dashboard", to: "/", icon: "flowbite:home-solid", roles: ["ADMIN"] },
  { labelKey: "reports", to: "/reports", icon: "basil:document-solid", roles: ["ADMIN"] },
  { labelKey: "adminInspections", to: "/admin-inspections", icon: "mdi:clipboard-remove-outline", roles: ["ADMIN"] },
  { labelKey: "approvalManagement", to: "/approval-management", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_ADMIN", "ADMIN"] },
  { labelKey: "qmReports", to: "/qm-reports", icon: "basil:document-solid", roles: ["QUALITY_ADMIN"] },
  { labelKey: "crossCheckApproval", to: "/cross-check-approval", icon: "mdi:shield-check-outline", roles: ["QUALITY_ADMIN", "ADMIN"] },
  { labelKey: "crossChecks", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["ADMIN"] },
  { labelKey: "products", to: "/products", icon: "mdi:cube", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { labelKey: "equipment", to: "/equipment", icon: "mdi:factory", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { labelKey: "customers", to: "/customers", icon: "mdi:office-building", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { labelKey: "processes", to: "/processes", icon: "mdi:cog-transfer-outline", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { labelKey: "inspectionOrders", to: "/inspection-orders", icon: "mdi:clipboard-text-outline", roles: ["PRODUCTION_MANAGER"] },
  { labelKey: "myOrders", to: "/my-orders", icon: "mdi:clipboard-list-outline", roles: ["PRODUCTION"] },
  { labelKey: "myPage", to: "/my-page", icon: "mdi:account-circle", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "PRODUCTION_MANAGER", "QUALITY"] },
];

const TabBarWeb = () => {
  const { user } = useAuth();
  const { t } = useTranslation("layout");
  const visibleTabs = user
    ? TABS.filter((tab) => tab.roles.includes(user.role))
    : [];
  const homePath = user ? ROLE_HOME[user.role] : "/";

  return (
  <aside className="flex h-dvh w-60 flex-col bg-white">
    <div className="flex items-center px-4 py-8 text-lg font-bold">
      <Link to={homePath} aria-label={t("goHome")}>
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
          <span>{t(`tabs.${tab.labelKey}`)}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);
};

export default TabBarWeb;
