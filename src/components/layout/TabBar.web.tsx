import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import Logo from "../../assets/Logo.svg";

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

const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "QUALITY_MANAGER",
  "WORKER",
  "QUALITY_STAFF",
];

const TABS: TabItem[] = [
  { label: "대시보드", to: "/dashboard", icon: "flowbite:home-solid", roles: ALL_ROLES },
  { label: "사용자 검색", to: "/userSearch", icon: "mdi:people", roles: ["SUPER_ADMIN"] },
  { label: "가입승인", to: "/approval", icon: "fluent:shield-task-48-filled", roles: ["SUPER_ADMIN"] },
  { label: "검사보고서", to: "/reports", icon: "basil:document-solid", roles: ["SUPER_ADMIN", "QUALITY_MANAGER", "QUALITY_STAFF"] },
];

// TODO: 서버 연동 후 로그인 응답에서 받은 역할로 교체
const CURRENT_ROLE: Role = "SUPER_ADMIN";

const TabBarWeb = () => {
  const visibleTabs = TABS.filter((tab) => tab.roles.includes(CURRENT_ROLE));

  return (
  <aside className="flex h-screen w-60 flex-col bg-white">
    <div className="flex items-center px-4 py-8 text-lg font-bold">
      <img src={Logo} className="w-14 xl:w-37" />
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
