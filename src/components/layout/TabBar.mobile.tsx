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