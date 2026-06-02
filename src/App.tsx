import SignupForm from "./features/auth/ui/SignupForm";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm";
import MyPage from "./features/auth/ui/MyPage";
import Layout from "./components/layout/Layout";
import NotFoundPage from "./components/layout/NotFoundPage";
import RouteGuard from "./features/auth/RouteGuard";
import NotificationPage from "./features/notification/ui/NotificationPage";
import ApprovalManagementPage from "./features/incomplete/ui/ApprovalManagementPage";
import AccountApprovalPage from "./features/account-approval/ui/AccountApprovalPage";
import InspectionOrdersPage from "./features/inspection-orders/ui/InspectionOrdersPage";
import ReportPage from "./features/report/ui/ReportPage";
import MyInspectionPage from "./features/my-inspection/ui/MyInspectionPage";
import ProductionHomePage from "./features/my-inspection/ui/ProductionHomePage";
import ScanPage from "./features/inspection/ui/ScanPage";
import StartInspectionPage from "./features/inspection/ui/StartInspectionPage";
import InspectionDetailPage from "./features/inspection/ui/InspectionDetailPage";
import InspectionMeasurePage from "./features/inspection/ui/InspectionMeasurePage";
import InspectionResultPage from "./features/inspection/ui/InspectionResultPage";
import ProductsPage from "./features/products/ui/ProductsPage";
import EquipmentPage from "./features/equipment/ui/EquipmentPage";
import CustomersPage from "./features/customers/ui/CustomersPage";

import AdminUserSearchPage from "./features/user-search/ui/AdminUserSearchPage";
import AdminReportPage from "./features/report/ui/AdminReportPage";
import AdminReportDetailPage from "./features/report/ui/AdminReportDetailPage";
import DashboardPage from "./features/dashboard/ui/DashboardPage";

import QualitySystemStatusPage from "./features/cross-check/ui/QualitySystemStatusPage";
import CrossCheckPendingPage from "./features/cross-check/ui/CrossCheckPendingPage";
import CrossCheckMeasurePage from "./features/cross-check/ui/CrossCheckMeasurePage";
import CrossCheckResultPage from "./features/cross-check/ui/CrossCheckResultPage";
import QualityHomePage from "./features/cross-check/ui/QualityHomePage";
import CrossCheckApprovalPage from "./features/cross-check/ui/CrossCheckApprovalPage";
import CrossCheckApprovalDetailPage from "./features/cross-check/ui/CrossCheckApprovalDetailPage";

import { useAuth } from "./features/auth/AuthContext";

function HomePage() {
  const { user } = useAuth();

  if (user?.role === "PRODUCTION") return <ProductionHomePage />;
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

            <Route element={<RouteGuard roles={["ADMIN"]} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/userSearch" element={<AdminUserSearchPage />} />

              <Route path="/approval" element={<AccountApprovalPage />} />

              <Route path="/reports" element={<AdminReportPage />} />

              <Route path="/products" element={<ProductsPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/customers" element={<CustomersPage />} />
            </Route>

            <Route element={<RouteGuard roles={["QUALITY_ADMIN"]} />}>
              <Route
                path="/inspection-orders"
                element={<InspectionOrdersPage />}
              />

              <Route
                path="/approval-management"
                element={<ApprovalManagementPage />}
              />

              <Route path="/qm-reports" element={<ReportPage />} />
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
              <Route
                path="/quality-status"
                element={<QualitySystemStatusPage />}
              />

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
            </Route>

            <Route element={<RouteGuard roles={["PRODUCTION", "QUALITY"]} />}>
              <Route path="/scan" element={<ScanPage />} />

              <Route
                path="/start-inspection"
                element={<StartInspectionPage />}
              />

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
