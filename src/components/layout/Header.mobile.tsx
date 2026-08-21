import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useUnreadCount } from "../../features/notification/api";
import { useAuth } from "../../features/auth/AuthContext";
import { runHeaderBackHandler } from "../../lib/headerBack";

const ROUTE_TITLES: Record<string, string> = {
  "/": "홈",
  "/reports": "검사보고서",
  "/approval-management": "승인관리",
  "/qm-reports": "보고서",
  "/inspections": "현황",
  "/scan": "품질검사시스템",
  "/products": "제품관리",
  "/equipment": "설비관리",
  "/customers": "고객사 관리",
  "/processes": "공정관리",
  "/cross-checks": "순회검사 현황",
  "/my-page": "마이페이지",
};

const HeaderMobile = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();

  const title =
    pathname === "/" && user?.role === "ADMIN"
      ? "대시보드"
      : /^\/inspection\/\d+\/measure$/.test(pathname)
        ? "품질 검사 시스템"
        : /^\/cross-check\/\d+\/measure$/.test(pathname)
          ? "순회 검사 시스템"
          : pathname.startsWith("/inspection/")
            ? "측정 항목 확인"
            : (ROUTE_TITLES[pathname] ?? "");

  const hasUnread = unreadCount > 0;
  const isNotificationsPage = pathname === "/notifications";
  // 생산 관리자(PRODUCTION_MANAGER)에게는 알림 기능을 노출하지 않는다.
  const showBell = user?.role !== "PRODUCTION_MANAGER";

  // 특정 페이지(측정 결과/측정 페이지)가 useHeaderBackHandler 로 뒤로가기 동작을
  // 가로챌 수 있다. 가로채지 않으면 기본 히스토리 뒤로가기.
  const handleBack = () => {
    if (runHeaderBackHandler()) return;
    navigate(-1);
  };

  return (
    <header className="relative flex h-14 items-center justify-center border-b border-[#E5E7EB] bg-white px-4">
      <button
        type="button"
        onClick={handleBack}
        aria-label="뒤로가기"
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-[#212121]"
      >
        <Icon icon="solar:alt-arrow-left-linear" width={24} height={24} />
      </button>

      <h1 className="text-base font-semibold">{title}</h1>

      {showBell && !isNotificationsPage && (
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