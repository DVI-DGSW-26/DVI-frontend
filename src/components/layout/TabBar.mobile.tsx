import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../features/auth/api";
import { visibleTabsFor } from "./tabVisibility";

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
      p === "/scan" || p.startsWith("/inspection/"),
  },

  { label: "홈", to: "/", icon: "flowbite:home-solid", roles: ["QUALITY"], iconSize: 34 },
  { label: "순회검사 현황", to: "/cross-checks", icon: "icon-park-outline:big-clock", roles: ["QUALITY", "ADMIN"] },
  { label: "순회검사 결재", to: "/cross-check-approval", icon: "mdi:shield-check-outline", roles: ["QUALITY_ADMIN", "ADMIN"] },

  { label: "자주검사 관리", to: "/admin-inspections", icon: "mdi:clipboard-remove-outline", roles: ["ADMIN"] },
  { label: "제품관리", to: "/products", icon: "mdi:cube", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { label: "설비관리", to: "/equipment", icon: "mdi:factory", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { label: "고객사 관리", to: "/customers", icon: "mdi:office-building", roles: ["ADMIN", "QUALITY_ADMIN"] },
  { label: "공정관리", to: "/processes", icon: "mdi:cog-transfer-outline", roles: ["ADMIN", "QUALITY_ADMIN"] },

  { label: "검사지시", to: "/inspection-orders", icon: "mdi:clipboard-text-outline", roles: ["PRODUCTION_MANAGER"], iconSize: 34 },
  { label: "내 검사지시", to: "/my-orders", icon: "mdi:clipboard-list-outline", roles: ["PRODUCTION"] },

  { label: "마이페이지", to: "/my-page", icon: "mdi:account-circle", roles: ["ADMIN", "QUALITY_ADMIN", "PRODUCTION", "PRODUCTION_MANAGER", "QUALITY"] },
];

// 한 줄 균등 분할로 버티는 최대 탭 수 — 지금 가장 많은 통합 관리자가 11개다.
// 이보다 많으면(모든 역할의 탭을 받는 테스트 계정) 아이콘이 겹친다.
const MAX_EVEN_TABS = 11;

const TabBarMobile = () => {
  const { user } = useAuth();
  const location = useLocation();

  const visibleTabs = visibleTabsFor(TABS, user?.role);
  // 테스트 계정은 모든 역할의 탭을 받아 한 줄에 다 들어가지 않는다. 그때만
  // 탭 폭을 고정하고 가로로 밀어 보게 한다. 일반 역할은 기존처럼 균등 분할.
  const crowded = visibleTabs.length > MAX_EVEN_TABS;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center border-t border-[#E5E7EB] bg-white ${
        crowded ? "overflow-x-auto" : "justify-around"
      }`}
    >
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
              return `flex items-center justify-center transition-colors ${
                crowded ? "w-14 shrink-0" : "flex-1"
              } ${
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