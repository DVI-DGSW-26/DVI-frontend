import { Fragment } from "react";
import { NavLink, Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import Logo from "../../assets/Logo.svg";
import { useAuth } from "../../features/auth/AuthContext";
import { ROLE_HOME } from "../../features/auth/constants";
import type { Role } from "../../features/auth/api";
import { visibleTabsFor } from "./tabVisibility";
import { useMenuBadges } from "./useMenuBadges";
import type { TabGroup } from "./tabVisibility";

type TabItem = {
  // layout 네임스페이스 tabs.* 키
  labelKey: string;
  to: string;
  icon: string;
  roles: Role[];
  // 묶음 제목(layout groups.*). 없으면 제목 없이 이어 붙인다.
  group?: TabGroup;
};

// 관리자 메뉴가 열한 줄 평면 목록이라 "결재할 게 있다"는 말에 어디를 열어야 할지 몰랐다.
// 결재 / 검사 현황 / 기준정보 세 묶음으로 나누고 묶음 제목을 단다.
const TABS: TabItem[] = [
  { labelKey: "dashboard", to: "/", icon: "flowbite:home-solid", roles: ["ADMIN"] },
  { labelKey: "approvalManagement", to: "/approval-management", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_ADMIN", "ADMIN"], group: "approval" },
  { labelKey: "crossCheckApproval", to: "/cross-check-approval", icon: "mdi:shield-check-outline", roles: ["QUALITY_ADMIN", "ADMIN"], group: "approval" },
  { labelKey: "adminInspections", to: "/admin-inspections", icon: "mdi:clipboard-remove-outline", roles: ["ADMIN"], group: "status" },
  { labelKey: "crossChecks", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["ADMIN"], group: "status" },
  { labelKey: "reports", to: "/reports", icon: "basil:document-solid", roles: ["ADMIN"], group: "status" },
  { labelKey: "qmReports", to: "/qm-reports", icon: "basil:document-solid", roles: ["QUALITY_ADMIN"], group: "status" },
  { labelKey: "tryoutReports", to: "/tryout-reports", icon: "mdi:file-document-edit-outline", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "PRODUCTION_MANAGER", "QUALITY"], group: "status" },
  { labelKey: "products", to: "/products", icon: "mdi:cube", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },
  { labelKey: "equipment", to: "/equipment", icon: "mdi:factory", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },
  { labelKey: "customers", to: "/customers", icon: "mdi:office-building", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },
  { labelKey: "processes", to: "/processes", icon: "mdi:cog-transfer-outline", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },
  { labelKey: "inspectionOrders", to: "/inspection-orders", icon: "mdi:clipboard-text-outline", roles: ["PRODUCTION_MANAGER"] },
  { labelKey: "myOrders", to: "/my-orders", icon: "mdi:clipboard-list-outline", roles: ["PRODUCTION"] },
  { labelKey: "myPage", to: "/my-page", icon: "mdi:account-circle", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "PRODUCTION_MANAGER", "QUALITY"] },
];

const TabBarWeb = () => {
  const { user } = useAuth();
  const { t } = useTranslation("layout");
  const visibleTabs = visibleTabsFor(TABS, user?.role);
  const badges = useMenuBadges();
  const homePath = user ? ROLE_HOME[user.role] : "/";

  return (
  <aside className="flex h-dvh w-60 flex-col bg-white">
    <div className="flex items-center px-4 py-8 text-lg font-bold">
      <Link to={homePath} aria-label={t("goHome")}>
        <img src={Logo} className="w-14 xl:w-37 cursor-pointer" />
      </Link>
    </div>

    <nav className="flex min-h-0 flex-1 flex-col gap-1 w-full overflow-y-auto px-4">
      {visibleTabs.map((tab, i) => (
        <Fragment key={tab.to}>
        {/* 묶음이 바뀌는 자리에만 제목 — 그 역할에 보이는 탭 기준이라 빈 묶음 제목은 안 생긴다. */}
        {/* 묶음이 끝나고 묶음 없는 탭(마이페이지 등)이 오면 선만 그어 앞 묶음에 딸려 보이지 않게. */}
        {!tab.group && visibleTabs[i - 1]?.group && (
          <div className="mx-2 my-2 border-t border-gray-100" />
        )}
        {tab.group && tab.group !== visibleTabs[i - 1]?.group && (
          <div className="px-2 pb-1 pt-4 text-[11px] font-semibold tracking-wide text-[#9CA3AF]">
            {t(`groups.${tab.group}`)}
          </div>
        )}
        <NavLink
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
          {/* 결재 대기 건수 — 어디부터 열어볼지 메뉴에서 바로 보이게. */}
          {badges[tab.labelKey] ? (
            <span className="ml-auto mr-2 rounded-full bg-[#DC2626] px-1.5 text-[11px] font-bold leading-5 text-white tabular-nums">
              {badges[tab.labelKey]}
            </span>
          ) : null}
        </NavLink>
        </Fragment>
      ))}
    </nav>
  </aside>
);
};

export default TabBarWeb;
