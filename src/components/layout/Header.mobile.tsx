import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useUnreadCount } from "../../features/notification/api";
import { useAuth } from "../../features/auth/AuthContext";

const ROUTE_TITLES: Record<string, string> = {
  "/": "홈",
  "/userSearch": "사용자 검색",
  "/approval": "가입승인",
  "/reports": "검사보고서",
  "/inspection-orders": "검사지시관리",
  "/approval-management": "승인관리",
  "/qm-reports": "보고서",
  "/inspections": "현황",
  "/scan": "품질검사시스템",
  "/products": "제품관리",
  "/equipment": "설비관리",
  "/customers": "고객사 관리",
  "/notifications": "알림",
};

const HeaderMobile = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { user } = useAuth();

  const title =
    pathname === "/" && user?.role === "ADMIN"
      ? "대시보드"
      : /^\/inspection\/\d+\/measure$/.test(pathname)
        ? "품질 검사 시스템"
        : pathname.startsWith("/inspection/")
          ? "측정 항목 확인"
          : (ROUTE_TITLES[pathname] ?? "");

  const hasUnread = unreadCount > 0;
  const isNotificationsPage = pathname === "/notifications";

  return (
    <header className="relative flex h-14 items-center justify-center border-b border-[#E5E7EB] bg-white px-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로가기"
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-[#212121]"
      >
        <Icon icon="solar:alt-arrow-left-linear" width={24} height={24} />
      </button>

      <h1 className="text-base font-semibold">{title}</h1>

      {!isNotificationsPage && (
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label="알림"
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-[#212121]"
        >
          <Icon icon="solar:bell-linear" width={22} height={22} />
          {hasUnread && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#EF4444]" />
          )}
        </button>
      )}
    </header>
  );
};

export default HeaderMobile;