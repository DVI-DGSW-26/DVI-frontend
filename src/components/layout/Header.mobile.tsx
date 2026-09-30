import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useUnreadCount } from "../../features/notification/api";
import { useAuth } from "../../features/auth/AuthContext";
import { runHeaderBackHandler } from "../../lib/headerBack";

// layout 네임스페이스 titles.* / tabs.* 키
const ROUTE_TITLE_KEYS: Record<string, string> = {
  "/": "titles.home",
  "/reports": "tabs.reports",
  "/approval-management": "tabs.approvalManagement",
  "/qm-reports": "tabs.qmReports",
  "/inspections": "titles.inspections",
  "/scan": "titles.scan",
  "/products": "tabs.products",
  "/equipment": "tabs.equipment",
  "/customers": "tabs.customers",
  "/processes": "tabs.processes",
  "/cross-checks": "tabs.crossChecks",
  "/my-page": "tabs.myPage",
};

const HeaderMobile = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation("layout");
  const { data: unreadCount = 0 } = useUnreadCount();

  const titleKey =
    pathname === "/" && (user?.role === "ADMIN" || user?.role === "TEST")
      ? "tabs.dashboard"
      : /^\/inspection\/\d+\/measure$/.test(pathname)
        ? "titles.inspectionMeasure"
        : /^\/cross-check\/\d+\/measure$/.test(pathname)
          ? "titles.crossCheckMeasure"
          : pathname.startsWith("/inspection/")
            ? "titles.inspectionDetail"
            : ROUTE_TITLE_KEYS[pathname];
  const title = titleKey ? t(titleKey) : "";

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
        aria-label={t("back")}
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-[#212121]"
      >
        <Icon icon="solar:alt-arrow-left-linear" width={24} height={24} />
      </button>

      <h1 className="text-base font-semibold">{title}</h1>

      {showBell && !isNotificationsPage && (
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label={t("notifications")}
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
