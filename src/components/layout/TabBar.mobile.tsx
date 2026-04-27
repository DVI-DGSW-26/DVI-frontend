import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";

export type Role =
  | "SUPER_ADMIN"
  | "QUALITY_MANAGER"
  | "WORKER"
  | "QUALITY_STAFF";

type TabItem = {
  label: string;
  to: string;
  icon: string;
  roles: Role[];
};

const TABS: TabItem[] = [
  { label: "대시보드", to: "/dashboard", icon: "flowbite:home-solid", roles: ["SUPER_ADMIN", "WORKER", "QUALITY_STAFF"] },
  { label: "사용자 검색", to: "/userSearch", icon: "mdi:people", roles: ["SUPER_ADMIN"] },
  { label: "가입승인", to: "/approval", icon: "fluent:shield-task-48-filled", roles: ["SUPER_ADMIN"] },
  { label: "대기", to: "/pending", icon: "material-symbols:schedule-outline", roles: ["WORKER", "QUALITY_STAFF"] },
  { label: "스캔", to: "/scan", icon: "mdi:qrcode-scan", roles: ["WORKER", "QUALITY_STAFF"] },
  { label: "자재", to: "/materials", icon: "mdi:package-variant-closed", roles: ["QUALITY_MANAGER"] },
  { label: "검사", to: "/inspection", icon: "fluent:shield-task-48-filled", roles: ["QUALITY_MANAGER"] },
  { label: "검사보고서", to: "/reports", icon: "basil:document-solid", roles: ["SUPER_ADMIN", "QUALITY_MANAGER", "QUALITY_STAFF"] },
];

// TODO: 서버 연동 후 로그인 응답에서 받은 역할로 교체
const CURRENT_ROLE: Role = "QUALITY_MANAGER";

const TabBarMobile = () => {
  const visibleTabs = TABS.filter((tab) => tab.roles.includes(CURRENT_ROLE));

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-[#E5E7EB] bg-white">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          aria-label={tab.label}
          className={({ isActive }) =>
            `flex flex-1 items-center justify-center transition-colors ${
              isActive ? "text-[#931B82]" : "text-[#A8A8A8]"
            }`
          }
        >
          <Icon icon={tab.icon} width={28} height={28} />
        </NavLink>
      ))}
    </nav>
  );
};

export default TabBarMobile;
