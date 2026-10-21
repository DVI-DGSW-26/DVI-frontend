import SignupForm from "./features/auth/ui/SignupForm";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm";
import MyPage from "./features/auth/ui/MyPage";
import Layout from "./components/layout/Layout";
import NotFoundPage from "./components/layout/NotFoundPage";
import RouteGuard from "./features/auth/RouteGuard";
import NotificationPage from "./features/notification/ui/NotificationPage";
import ApprovalManagementPage from "./features/incomplete/ui/ApprovalManagementPage";
import AccountApprovalPage from "./features/account-approval/ui/AccountApprovalPage";
import ReportPage from "./features/report/ui/ReportPage";
import MyInspectionPage from "./features/my-inspection/ui/MyInspectionPage";
import ProductionHomePage from "./features/my-inspection/ui/ProductionHomePage";
import ScanPage from "./features/inspection/ui/ScanPage";
import InspectionDetailPage from "./features/inspection/ui/InspectionDetailPage";
import InspectionMeasurePage from "./features/inspection/ui/InspectionMeasurePage";
import InspectionResultPage from "./features/inspection/ui/InspectionResultPage";
import InspectionNgViewPage from "./features/inspection/ui/InspectionNgViewPage";
import ProductsPage from "./features/products/ui/ProductsPage";
import EquipmentPage from "./features/equipment/ui/EquipmentPage";
import CustomersPage from "./features/customers/ui/CustomersPage";
import ProcessesPage from "./features/process/ui/ProcessesPage";
import InspectionOrdersPage from "./features/inspection-orders/ui/InspectionOrdersPage";
import MyInspectionOrdersPage from "./features/inspection-orders/ui/MyInspectionOrdersPage";

import AdminReportPage from "./features/report/ui/AdminReportPage";
import AdminReportDetailPage from "./features/report/ui/AdminReportDetailPage";
import AdminInspectionListPage from "./features/admin-inspection/ui/AdminInspectionListPage";
import DashboardPage from "./features/dashboard/ui/DashboardPage";

import CrossCheckPendingPage from "./features/cross-check/ui/CrossCheckPendingPage";
import CrossCheckMeasurePage from "./features/cross-check/ui/CrossCheckMeasurePage";
import CrossCheckResultPage from "./features/cross-check/ui/CrossCheckResultPage";
import QualityHomePage from "./features/cross-check/ui/QualityHomePage";
import MissedInspectionsPage from "./features/incomplete/ui/MissedInspectionsPage";
import CrossCheckApprovalPage from "./features/cross-check/ui/CrossCheckApprovalPage";
import CrossCheckApprovalDetailPage from "./features/cross-check/ui/CrossCheckApprovalDetailPage";

import MonitorPage from "./features/monitor/ui/MonitorPage";

import TryoutReportListPage from "./features/tryout-report/ui/TryoutReportListPage";
import TryoutReportDetailPage from "./features/tryout-report/ui/TryoutReportDetailPage";
import TryoutReportFormPage from "./features/tryout-report/ui/TryoutReportFormPage";

import EquipmentReportListPage from "./features/equipment-report/ui/EquipmentReportListPage";
import EquipmentReportDetailPage from "./features/equipment-report/ui/EquipmentReportDetailPage";

import { useTranslation } from "react-i18next";
import { useAuth } from "./features/auth/AuthContext";
import { ROLE_HOME } from "./features/auth/constants";
import { Navigate } from "react-router-dom";
import { useNotificationAlerts } from "./features/notification/model/useNotificationAlerts";
import ServerStatusOverlay from "./components/shared/ServerStatusOverlay";

// 알림을 앱 밖(OS 알림창)으로 내보내는 배선. 그리는 것은 없다.
// useNavigate 를 쓰므로 BrowserRouter 안에 있어야 한다.
function NotificationAlerts() {
  useNotificationAlerts();
  return null;
}

// 측정 화면에서 조기 마감하면 같은 라우트의 새 검사(재검사 초품)로 이동한다.
// 검사 id 로 key 를 걸어 화면을 새로 만든다 — 아니면 이전 검사의 진행 위치·사진이 남는다.
function InspectionMeasureRoute() {
  const { inspectionId } = useParams();
  return <InspectionMeasurePage key={inspectionId} />;
}

function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (user?.role === "PRODUCTION") return <ProductionHomePage />;
  if (user?.role === "PRODUCTION_MANAGER") return <InspectionOrdersPage />;
  // 테스트 계정은 모든 역할의 화면을 쓰지만 홈은 하나여야 한다 — 전체 현황이
  // 보이는 관리자 대시보드로 둔다. 다른 역할 화면은 메뉴로 들어간다.
  if (user?.role === "ADMIN" || user?.role === "TEST") return <DashboardPage />;
  if (user?.role === "QUALITY") return <QualityHomePage />;
  // 품질관리자는 "/" 에 화면이 없다 — 권한 밖 링크·404 "홈으로"가 모두 "/" 로 보내므로
  // 실제 첫 화면(ROLE_HOME)으로 넘긴다.
  if (user?.role === "QUALITY_ADMIN")
    return <Navigate to={ROLE_HOME.QUALITY_ADMIN} replace />;
  if (user?.role === "EQUIPMENT_MANAGER")
    return <Navigate to={ROLE_HOME.EQUIPMENT_MANAGER} replace />;

  return <div className="p-6">{t("home", { ns: "shared" })}</div>;
}

function App() {
  return (
    <BrowserRouter>
      <NotificationAlerts />
      {/* 서버 끊김·지연 알림 — 어느 화면에 있든 뜨도록 라우트 밖에 둔다. */}
      <ServerStatusOverlay />
      <Routes>
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/login" element={<LoginForm />} />

        <Route element={<RouteGuard />}>
          {/* 공장 벽걸이 모니터 — 헤더/탭바 없이 전체화면으로 띄운다. 조작 대상이
              아니라 표시 전용이라 Layout 밖에 둔다. 권한은 인증만(백엔드 기준
              "로그인한 모든 역할"). */}
          <Route path="/monitor" element={<MonitorPage />} />

          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="/my-page" element={<MyPage />} />
            {/* 보고서 상세는 인증된 모든 사용자에게 공개 — 알림 클릭으로 본인 검사의
                보고서를 보러 들어올 수 있어야 함. 백엔드 /report/{id} 에서 권한 체크. */}
            <Route
              path="/reports/:reportId"
              element={<AdminReportDetailPage />}
            />
            {/* 자주검사 NG 알림 진입용 읽기전용 상세 — 순회검사자/관리자 포함 전 역할
                공개. NG 시점엔 보고서가 아직 없어 GET /inspection/{id}(권한:전체)로
                조회한다. /inspection/{id} 측정 흐름(생산자/품질 전용)과는 별도 경로. */}
            <Route
              path="/inspection/:inspectionId/view"
              element={<InspectionNgViewPage />}
            />

            <Route element={<RouteGuard roles={["ADMIN"]} />}>
              {/* 예전 첫 화면 주소 — 대시보드는 "/" 로 합쳤다(메뉴 선택·헤더 제목이 "/" 기준). */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              {/* 계정(가입 요청) 승인 — 대시보드 "빠른 승인 대기"의 전체보기 진입점. */}
              <Route path="/approval" element={<AccountApprovalPage />} />

              <Route path="/reports" element={<AdminReportPage />} />

              <Route
                path="/admin-inspections"
                element={<AdminInspectionListPage />}
              />
            </Route>

            {/* 기준정보 관리 — 제품·설비·고객사·공정. 통합관리자와 품질관리자 둘 다
                같은 화면을 쓴다(권한만 열어둔 것이고 기능 차이는 없다). */}
            <Route element={<RouteGuard roles={["ADMIN", "QUALITY_ADMIN"]} />}>
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/processes" element={<ProcessesPage />} />
            </Route>

            <Route element={<RouteGuard roles={["QUALITY_ADMIN"]} />}>
              <Route path="/qm-reports" element={<ReportPage />} />
            </Route>

            {/* 승인관리 — 자주검사 미완료(INCOMPLETE) 결재. 품질관리자 + 통합관리자 둘 다 접근. */}
            <Route element={<RouteGuard roles={["QUALITY_ADMIN", "ADMIN"]} />}>
              <Route
                path="/approval-management"
                element={<ApprovalManagementPage />}
              />
            </Route>

            <Route element={<RouteGuard roles={["QUALITY_ADMIN", "ADMIN"]} />}>
              <Route
                path="/cross-check-approval"
                element={<CrossCheckApprovalPage />}
              />
            </Route>

            {/* 결재 상세는 순회검사자(QUALITY)도 읽기 전용으로 진입 가능 — 반려된
                본인 검사의 사유 확인용. 승인/반려 액션은 페이지 내에서 결재자에게만 노출. */}
            <Route
              element={
                <RouteGuard roles={["QUALITY_ADMIN", "ADMIN", "QUALITY"]} />
              }
            >
              <Route
                path="/cross-check-approval/:crossCheckId"
                element={<CrossCheckApprovalDetailPage />}
              />
            </Route>

            {/* 미검사 사유 — 순회검사자가 사유 없는 미완료에 사유를 대신 적는다. */}
            <Route
              element={<RouteGuard roles={["QUALITY", "QUALITY_ADMIN", "ADMIN"]} />}
            >
              <Route
                path="/missed-inspections"
                element={<MissedInspectionsPage />}
              />
            </Route>

            <Route element={<RouteGuard roles={["QUALITY", "ADMIN"]} />}>
              <Route path="/cross-checks" element={<CrossCheckPendingPage />} />

              <Route
                path="/cross-check/:crossCheckId/measure"
                element={<CrossCheckMeasurePage />}
              />

              <Route
                path="/cross-check/:crossCheckId/result"
                element={<CrossCheckResultPage />}
              />
            </Route>

            <Route element={<RouteGuard roles={["PRODUCTION"]} />}>
              <Route path="/inspections" element={<MyInspectionPage />} />
              {/* 자주검사자가 생산 관리자에게 배정받은 검사 지시 목록 (GET /inspection-order/my). */}
              <Route path="/my-orders" element={<MyInspectionOrdersPage />} />
            </Route>

            {/* 생산 관리자 — 자주검사자에게 검사 지시 배정/관리 (PRODUCTION_MANAGER 전용). */}
            <Route element={<RouteGuard roles={["PRODUCTION_MANAGER"]} />}>
              <Route
                path="/inspection-orders"
                element={<InspectionOrdersPage />}
              />
            </Route>

            <Route element={<RouteGuard roles={["PRODUCTION", "QUALITY"]} />}>
              <Route path="/scan" element={<ScanPage />} />

              <Route
                path="/inspection/:inspectionId"
                element={<InspectionDetailPage />}
              />

              <Route
                path="/inspection/:inspectionId/measure"
                element={<InspectionMeasureRoute />}
              />

              <Route
                path="/inspection/:inspectionId/result"
                element={<InspectionResultPage />}
              />
            </Route>

            {/* 설비 이상 신고 목록·상세. 신고는 생산·품질이 헤더 버튼으로 한다.
                상세 경로는 알림 linkUrl(/equipment-report/{id})과 같다. */}
            <Route
              element={
                <RouteGuard
                  roles={["PRODUCTION_MANAGER", "EQUIPMENT_MANAGER", "ADMIN"]}
                />
              }
            >
              <Route path="/equipment-report" element={<EquipmentReportListPage />} />
              <Route path="/equipment-report/:id" element={<EquipmentReportDetailPage />} />
            </Route>

            {/* 매칭 안 된 모든 경로 — 잘못된 알림 linkUrl 등으로 흰 화면이 뜨지 않도록. */}
            {/* 시압 결과보고서 — 모든 역할 (수정·삭제 권한은 서버가 작성자·관리자로 막는다) */}
            <Route path="/tryout-reports" element={<TryoutReportListPage />} />
            <Route path="/tryout-reports/new" element={<TryoutReportFormPage />} />
            <Route path="/tryout-reports/:id" element={<TryoutReportDetailPage />} />
            <Route path="/tryout-reports/:id/edit" element={<TryoutReportFormPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
