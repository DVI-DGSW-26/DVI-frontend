import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useUnreadCount } from "../../features/notification/api";
import { useAuth } from "../../features/auth/AuthContext";
import { runHeaderBackHandler } from "../../lib/headerBack";
import EquipmentReportButton from "../../features/equipment-report/ui/EquipmentReportButton";
import { useCanReportEquipment } from "../../features/equipment-report/lib/permissions";
import LanguageToggle from "./LanguageToggle";

// layout 네임스페이스 titles.* / tabs.* 키
const ROUTE_TITLE_KEYS: Record<string, string> = {
  "/": "titles.home",
  "/reports": "tabs.reports",
  "/approval-management": "titles.approvalManagement",
  "/missed-inspections": "tabs.missedInspections",
  "/qm-reports": "titles.qmReports",
  "/inspections": "titles.inspections",
  "/scan": "titles.scan",
  "/products": "tabs.products",
  "/equipment": "tabs.equipment",
  "/customers": "tabs.customers",
  "/processes": "tabs.processes",
  "/cross-checks": "tabs.crossChecks",
  "/my-page": "tabs.myPage",
  "/notifications": "titles.notifications",
  "/equipment-report": "titles.equipmentReports",
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
            : pathname.startsWith("/equipment-report/")
              ? "titles.equipmentReportDetail"
              : ROUTE_TITLE_KEYS[pathname];
  const title = titleKey ? t(titleKey) : "";

  const hasUnread = unreadCount > 0;
  const isNotificationsPage = pathname === "/notifications";
  // 생산 관리자(PRODUCTION_MANAGER)에게는 알림 기능을 노출하지 않는다.
  const showBell = user?.role !== "PRODUCTION_MANAGER";
  const canReport = useCanReportEquipment();

  // 특정 페이지(측정 결과/측정 페이지)가 useHeaderBackHandler 로 뒤로가기 동작을
  // 가로챌 수 있다. 가로채지 않으면 기본 히스토리 뒤로가기.
  const handleBack = () => {
    if (runHeaderBackHandler()) return;
    navigate(-1);
  };

  return (
    <header className="relative flex h-14 items-center justify-center gap-2 border-b border-[#E5E7EB] bg-white px-2">
      {/* 오른쪽은 언어·알림으로 차 있어 설비 신고 버튼은 뒤로가기 옆에 둔다.
          버튼이 있으면 제목을 양쪽 버튼 사이 남은 폭에 두어 겹치지 않게 한다. */}
      <div
        className={
          canReport
            ? "flex shrink-0 items-center gap-1"
            : "absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1"
        }
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label={t("back")}
          className="flex h-8 w-8 items-center justify-center text-[#212121]"
        >
          <Icon icon="solar:alt-arrow-left-linear" width={24} height={24} />
        </button>
        <EquipmentReportButton compact />
      </div>

      <h1
        className={
          canReport
            ? "min-w-0 flex-1 truncate text-center text-base font-semibold"
            : "text-base font-semibold"
        }
      >
        {title}
      </h1>

      <div
        className={
          canReport
            ? "flex shrink-0 items-center"
            : "absolute right-2 top-1/2 flex -translate-y-1/2 items-center"
        }
      >
        <LanguageToggle />
        {showBell && !isNotificationsPage && (
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label={t("notifications")}
            className="relative flex h-8 w-8 items-center justify-center text-[#212121]"
          >
            <Icon icon="solar:bell-linear" width={22} height={22} />
            {hasUnread && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#EF4444]" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};

export default HeaderMobile;
