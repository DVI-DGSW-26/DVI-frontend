import SignupForm from "./features/auth/ui/SignupForm"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm"
import Layout from "./components/layout/Layout"
import RouteGuard from "./features/auth/RouteGuard"
import NotificationPage from "./features/notification/ui/NotificationPage"
import ApprovalManagementPage from "./features/incomplete/ui/ApprovalManagementPage"
import AccountApprovalPage from "./features/account-approval/ui/AccountApprovalPage"
import InspectionOrdersPage from "./features/inspection-orders/ui/InspectionOrdersPage"
import ReportPage from "./features/report/ui/ReportPage"
import MyInspectionPage from "./features/my-inspection/ui/MyInspectionPage"
import ProductionHomePage from "./features/my-inspection/ui/ProductionHomePage"
import ScanPage from "./features/inspection/ui/ScanPage"
import InspectionDetailPage from "./features/inspection/ui/InspectionDetailPage"
import InspectionMeasurePage from "./features/inspection/ui/InspectionMeasurePage"
import InspectionResultPage from "./features/inspection/ui/InspectionResultPage"
import ProductsPage from "./features/products/ui/ProductsPage"
import EquipmentPage from "./features/equipment/ui/EquipmentPage"
import CustomersPage from "./features/customers/ui/CustomersPage"

import AdminUserSearchPage from "./features/user-search/ui/AdminUserSearchPage"
import AdminReportPage from "./features/report/ui/AdminReportPage"
import AdminReportDetailPage from "./features/report/ui/AdminReportDetailPage"
import DashboardPage from "./features/dashboard/ui/DashboardPage"

import QualitySystemStatusPage from "./features/cross-check/ui/QualitySystemStatusPage"
import CrossCheckPendingPage from "./features/cross-check/ui/CrossCheckPendingPage"
import QualityHomePage from "./features/cross-check/ui/QualityHomePage"

import { useAuth } from "./features/auth/AuthContext"

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

            <Route element={<RouteGuard roles={["ADMIN"]} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/userSearch" element={<AdminUserSearchPage />} />

              <Route path="/approval" element={<AccountApprovalPage />} />

              <Route path="/reports" element={<AdminReportPage />} />
              <Route
                path="/reports/:reportId"
                element={<AdminReportDetailPage />}
              />
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
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/customers" element={<CustomersPage />} />
            </Route>

            <Route element={<RouteGuard roles={["QUALITY"]} />}>
              <Route
                path="/quality-status"
                element={<QualitySystemStatusPage />}
              />

              <Route
                path="/cross-checks"
                element={<CrossCheckPendingPage />}
              />
            </Route>

            <Route element={<RouteGuard roles={["PRODUCTION"]} />}>
              <Route path="/inspections" element={<MyInspectionPage />} />
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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App