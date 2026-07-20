import SignupForm from "./features/auth/ui/SignupForm";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm";
import MyPage from "./features/auth/ui/MyPage";
import Layout from "./components/layout/Layout";
import NotFoundPage from "./components/layout/NotFoundPage";
import RouteGuard from "./features/auth/RouteGuard";
import NotificationPage from "./features/notification/ui/NotificationPage";
import ApprovalManagementPage from "./features/incomplete/ui/ApprovalManagementPage";
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
import CrossCheckApprovalPage from "./features/cross-check/ui/CrossCheckApprovalPage";
import CrossCheckApprovalDetailPage from "./features/cross-check/ui/CrossCheckApprovalDetailPage";

import MonitorPage from "./features/monitor/ui/MonitorPage";

import { useAuth } from "./features/auth/AuthContext";

function HomePage() {
  const { user } = useAuth();

  if (user?.role === "PRODUCTION") return <ProductionHomePage />;
  if (user?.role === "PRODUCTION_MANAGER") return <InspectionOrdersPage />;
  if (user?.role === "ADMIN") return <DashboardPage />;
  if (user?.role === "QUALITY") return <QualityHomePage />;

  return <div className="p-6">홈</div>;
}

function App() {
  return (
    <BrowserRouter>
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
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/reports" element={<AdminReportPage />} />

              <Route
                path="/admin-inspections"
                element={<AdminInspectionListPage />}
              />

              <Route path="/products" element={<ProductsPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/customers" element={<CustomersPage />} />
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
                element={<InspectionMeasurePage />}
              />

              <Route
                path="/inspection/:inspectionId/result"
                element={<InspectionResultPage />}
              />
            </Route>

            {/* 매칭 안 된 모든 경로 — 잘못된 알림 linkUrl 등으로 흰 화면이 뜨지 않도록. */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
