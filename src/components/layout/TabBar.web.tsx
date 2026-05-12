import { NavLink } from "react-router-dom";
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
];

const TabBarWeb = () => {
  const { user } = useAuth();
  const visibleTabs = user
    ? TABS.filter((tab) => tab.roles.includes(user.role))
    : [];

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
