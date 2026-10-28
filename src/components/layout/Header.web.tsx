import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useUnreadCount } from "../../features/notification/api";
import { useAuth } from "../../features/auth/AuthContext";
import { canSwitchAccounts } from "../../features/auth/constants";
import AccountSwitcher from "../../features/auth/ui/AccountSwitcher";
import EquipmentReportButton from "../../features/equipment-report/ui/EquipmentReportButton";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

// layout 네임스페이스 titles.* / tabs.* 키
const ROUTE_TITLE_KEYS: Record<string, string> = {
  "/": "tabs.dashboard",
  "/reports": "tabs.reports",
  "/approval-management": "titles.approvalManagement",
  "/missed-inspections": "tabs.missedInspections",
  "/qm-reports": "titles.qmReports",
  "/products": "tabs.products",
  "/equipment": "tabs.equipment",
  "/customers": "tabs.customers",
  "/processes": "tabs.processes",
  "/cross-check-approval": "tabs.crossCheckApproval",
  "/tryout-reports": "tabs.tryoutReports",
  "/my-page": "tabs.myPage",
  "/notifications": "titles.notifications",
  "/equipment-report": "titles.equipmentReports",
};

const HeaderWeb = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, accounts } = useAuth();
  const { t } = useTranslation(["layout", "common"]);
  const { data: unreadCount = 0 } = useUnreadCount();
  const titleKey = pathname.startsWith("/equipment-report/")
    ? "titles.equipmentReportDetail"
    : ROUTE_TITLE_KEYS[pathname];
  const title = titleKey ? t(`layout:${titleKey}`) : "";
  const hasUnread = unreadCount > 0;
  const isNotificationsPage = pathname === "/notifications";
  // 생산 관리자(PRODUCTION_MANAGER)에게는 알림 기능을 노출하지 않는다.
  const showBell = user?.role !== "PRODUCTION_MANAGER";
  // 계정 전환은 통합 관리자 전용.
  const showSwitcher = canSwitchAccounts(user, accounts);

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="sidebar-scope flex h-24 items-center bg-surface px-6">
      <h1 className="text-3xl font-bold">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        {/* 생산·품질 작업자는 어느 화면에서든 설비 이상을 바로 신고한다. */}
        <div className="mr-2">
          <EquipmentReportButton />
        </div>
        <ThemeToggle />
        <LanguageToggle />

        {showBell && !isNotificationsPage && (
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label={t("layout:notifications")}
            className="relative flex h-10 w-10 items-center justify-center text-fg"
          >
            <Icon icon="solar:bell-linear" width={26} height={26} />
            {hasUnread && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
            )}
          </button>
        )}

        {showSwitcher && user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-fg">
                {user.name?.[0] ?? "?"}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-medium text-fg">
                  {user.name}
                </span>
                <span className="block text-xs text-fg-muted">
                  {t(`common:roles.${user.role}`)}
                </span>
              </span>
              <Icon
                icon="solar:alt-arrow-down-linear"
                width={16}
                height={16}
                className="text-fg-muted"
              />
            </button>

            {open && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-edge bg-surface shadow-lg">
                <p className="border-b border-line px-4 py-2 text-xs font-semibold text-fg-muted">
                  {t("layout:accountSwitch")}
                </p>
                <AccountSwitcher onDone={() => setOpen(false)} />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderWeb;
