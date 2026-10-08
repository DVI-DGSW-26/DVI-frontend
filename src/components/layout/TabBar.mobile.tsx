import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../features/auth/api";
import { TAB_GROUP_ORDER, visibleTabsFor } from "./tabVisibility";
import type { TabGroup } from "./tabVisibility";
import { useMenuBadges } from "./useMenuBadges";
import type { MenuBadges } from "./useMenuBadges";

type TabItem = {
  // layout 네임스페이스 tabs.* 키
  labelKey: string;
  to: string;
  icon: string;
  roles: Role[];
  iconSize?: number;
  // 현재 pathname 으로 활성화 여부를 커스텀 판정. 미지정 시 NavLink end-match.
  activeMatch?: (pathname: string) => boolean;
  // "더보기" 안에서 묶어 보여줄 제목(layout groups.*).
  group?: TabGroup;
};

// 탭이 많은 역할은 앞에서부터 MAX_PRIMARY 개만 탭바에 두고 나머지는 "더보기"로 보낸다 —
// 그래서 관리자 탭은 자주 여는 것(대시보드·결재)을 앞에 둔다.
const TABS: TabItem[] = [
  { labelKey: "dashboard", to: "/", icon: "flowbite:home-solid", roles: ["ADMIN"] },
  { labelKey: "approvalManagement", to: "/approval-management", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_ADMIN", "ADMIN"], group: "approval" },
  { labelKey: "crossCheckApproval", to: "/cross-check-approval", icon: "mdi:shield-check-outline", roles: ["QUALITY_ADMIN", "ADMIN"], group: "approval" },
  { labelKey: "reports", to: "/reports", icon: "basil:document-solid", roles: ["ADMIN"], group: "status" },
  { labelKey: "qmReports", to: "/qm-reports", icon: "basil:document-solid", roles: ["QUALITY_ADMIN"], group: "status" },

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
  { labelKey: "crossChecks", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["QUALITY", "ADMIN"], group: "status" },

  { labelKey: "adminInspections", to: "/admin-inspections", icon: "mdi:clipboard-remove-outline", roles: ["ADMIN"], group: "status" },
  { labelKey: "products", to: "/products", icon: "mdi:cube", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },
  { labelKey: "equipment", to: "/equipment", icon: "mdi:factory", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },
  { labelKey: "customers", to: "/customers", icon: "mdi:office-building", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },
  { labelKey: "processes", to: "/processes", icon: "mdi:cog-transfer-outline", roles: ["ADMIN", "QUALITY_ADMIN"], group: "master" },

  { labelKey: "inspectionOrders", to: "/inspection-orders", icon: "mdi:clipboard-text-outline", roles: ["PRODUCTION_MANAGER"], iconSize: 34 },
  { labelKey: "myOrders", to: "/my-orders", icon: "mdi:clipboard-list-outline", roles: ["PRODUCTION"] },

  { labelKey: "myPage", to: "/my-page", icon: "mdi:account-circle", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "PRODUCTION_MANAGER", "QUALITY"] },
];

// 이보다 많으면 "더보기"로 접는다. 작업자·순회검사자(5개 이하)는 지금처럼 아이콘만 한 줄.
const MAX_TABS = 5;
const MAX_PRIMARY = MAX_TABS - 1;

const TabBarMobile = () => {
  const { user } = useAuth();
  const { t } = useTranslation("layout");
  const location = useLocation();
  // 시트를 연 화면의 경로 — 다른 화면으로 이동하면 저절로 닫힌다.
  const [moreOpenAt, setMoreOpenAt] = useState<string | null>(null);
  const moreOpen = moreOpenAt === location.pathname;

  const visibleTabs = visibleTabsFor(TABS, user?.role);
  const badges = useMenuBadges();
  // 통합 관리자는 탭이 열한 개라 글자 없는 아이콘만 한 줄로 늘어섰고, 비슷한 방패
  // 아이콘이 둘이라 구분도 안 됐다. 많으면 앞의 넷 + "더보기"만 두고 글자를 함께 쓴다.
  const collapsed = visibleTabs.length > MAX_TABS;
  const primary = collapsed ? visibleTabs.slice(0, MAX_PRIMARY) : visibleTabs;
  const overflow = collapsed ? visibleTabs.slice(MAX_PRIMARY) : [];

  const isTabActive = (tab: TabItem) =>
    tab.activeMatch?.(location.pathname) ?? location.pathname === tab.to;
  const overflowActive = overflow.some(isTabActive);

  return (
    <>
      {moreOpen && (
        <MoreSheet
          badges={badges}
          tabs={overflow}
          isActive={isTabActive}
          onClose={() => setMoreOpenAt(null)}
        />
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-[#E5E7EB] bg-white">
        {primary.map((tab) => {
          const customActive = tab.activeMatch?.(location.pathname);
          return (
            <NavLink
              key={`${tab.labelKey}-${tab.to}`}
              to={tab.to}
              end
              aria-label={t(`tabs.${tab.labelKey}`)}
              className={({ isActive: navActive }) => {
                const isActive = customActive ?? navActive;
                return `flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? "text-[#931B82]" : "text-[#A8A8A8]"
                }`;
              }}
            >
              <span className="relative">
                <Icon
                  icon={tab.icon}
                  width={collapsed ? 24 : (tab.iconSize ?? 28)}
                  height={collapsed ? 24 : (tab.iconSize ?? 28)}
                />
                <CountBadge n={badges[tab.labelKey]} />
              </span>
              {collapsed && (
                <span className="max-w-full truncate px-0.5 text-[10px] font-medium">
                  {t(`tabs.${tab.labelKey}`)}
                </span>
              )}
            </NavLink>
          );
        })}
        {collapsed && (
          <button
            type="button"
            onClick={() =>
              setMoreOpenAt((v) => (v === location.pathname ? null : location.pathname))
            }
            aria-expanded={moreOpen}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
              moreOpen || overflowActive ? "text-[#931B82]" : "text-[#A8A8A8]"
            }`}
          >
            <Icon icon="solar:menu-dots-bold" width={24} height={24} />
            <span className="text-[10px] font-medium">{t("tabs.more")}</span>
          </button>
        )}
      </nav>
    </>
  );
};

/** "더보기" 시트 — 탭바에 못 올린 메뉴를 웹 사이드바와 같은 묶음으로 보여준다. */
/** 아이콘 오른쪽 위 건수 — 결재 대기가 있을 때만. */
function CountBadge({ n }: { n: number | undefined }) {
  if (!n) return null;
  return (
    <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-[#DC2626] px-1 text-center text-[10px] font-bold leading-4 text-white tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function MoreSheet({
  badges,
  tabs,
  isActive,
  onClose,
}: {
  badges: MenuBadges;
  tabs: TabItem[];
  isActive: (tab: TabItem) => boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("layout");
  const groups: (TabGroup | undefined)[] = [...TAB_GROUP_ORDER, undefined];
  return (
    <div className="fixed inset-0 z-20 bg-black/30" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-16 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-3 pt-2 shadow-lg"
      >
        {groups.map((g) => {
          const items = tabs.filter((tab) => tab.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g ?? "etc"} className="pt-2">
              {g && (
                <div className="px-1 pb-1 text-[11px] font-semibold text-[#9CA3AF]">
                  {t(`groups.${g}`)}
                </div>
              )}
              <ul className="grid grid-cols-2 gap-1.5">
                {items.map((tab) => (
                  <li key={`${tab.labelKey}-${tab.to}`}>
                    <NavLink
                      to={tab.to}
                      end
                      onClick={onClose}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive(tab)
                          ? "bg-[#F3E8F7] text-[#931B82]"
                          : "text-[#212121] hover:bg-gray-50"
                      }`}
                    >
                      <Icon icon={tab.icon} width={20} height={20} />
                      <span className="truncate">{t(`tabs.${tab.labelKey}`)}</span>
                      {badges[tab.labelKey] ? (
                        <span className="ml-auto rounded-full bg-[#DC2626] px-1.5 text-[11px] font-bold leading-5 text-white tabular-nums">
                          {badges[tab.labelKey]}
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TabBarMobile;
