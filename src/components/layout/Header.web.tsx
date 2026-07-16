import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useUnreadCount } from "../../features/notification/api";
import { useAuth } from "../../features/auth/AuthContext";

const ROUTE_TITLES: Record<string, string> = {
  "/": "대시보드",
  "/reports": "검사보고서",
  "/approval-management": "승인관리",
  "/qm-reports": "보고서",
  "/products": "제품관리",
  "/equipment": "설비관리",
  "/customers": "고객사 관리",
  "/cross-check-approval": "순회검사 결재",
  "/my-page": "마이페이지",
  "/notifications": "알림",
};

const HeaderWeb = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();
  const title = ROUTE_TITLES[pathname] ?? "";
  const hasUnread = unreadCount > 0;
  const isNotificationsPage = pathname === "/notifications";
  // 생산 관리자(PRODUCTION_MANAGER)에게는 알림 기능을 노출하지 않는다.
  const showBell = user?.role !== "PRODUCTION_MANAGER";

  return (
    <header className="flex h-24 items-center bg-white px-6">
      <h1 className="text-3xl font-bold">{title}</h1>

      {showBell && !isNotificationsPage && (
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label="알림"
          className="relative ml-auto flex h-10 w-10 items-center justify-center text-[#212121]"
        >
          <Icon icon="solar:bell-linear" width={26} height={26} />
          {hasUnread && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EF4444]" />
          )}
        </button>
      )}
    </header>
  );
};

export default HeaderWeb;
