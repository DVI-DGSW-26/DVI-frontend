import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useUnreadCount } from "../../features/notification/api";
import { useAuth } from "../../features/auth/AuthContext";
import {
  canSwitchAccounts,
  ROLE_LABEL,
} from "../../features/auth/constants";
import AccountSwitcher from "../../features/auth/ui/AccountSwitcher";

const ROUTE_TITLES: Record<string, string> = {
  "/": "대시보드",
  "/reports": "검사보고서",
  "/approval-management": "승인관리",
  "/qm-reports": "보고서",
  "/products": "제품관리",
  "/equipment": "설비관리",
  "/customers": "고객사 관리",
  "/processes": "공정관리",
  "/cross-check-approval": "순회검사 결재",
  "/my-page": "마이페이지",
  "/notifications": "알림",
};

const HeaderWeb = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, accounts } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();
  const title = ROUTE_TITLES[pathname] ?? "";
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
    <header className="flex h-24 items-center bg-white px-6">
      <h1 className="text-3xl font-bold">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        {showBell && !isNotificationsPage && (
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label="알림"
            className="relative flex h-10 w-10 items-center justify-center text-[#212121]"
          >
            <Icon icon="solar:bell-linear" width={26} height={26} />
            {hasUnread && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EF4444]" />
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
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-[#F3F4F6]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3E8F7] text-sm font-semibold text-[#931B82]">
                {user.name?.[0] ?? "?"}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-medium text-[#212121]">
                  {user.name}
                </span>
                <span className="block text-xs text-[#6B7280]">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
              <Icon
                icon="solar:alt-arrow-down-linear"
                width={16}
                height={16}
                className="text-[#6B7280]"
              />
            </button>

            {open && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-[#6B7280]">
                  계정 전환
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
