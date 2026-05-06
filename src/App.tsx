import SignupForm from "./features/auth/ui/SignupForm"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm"
import Layout from "./components/layout/Layout"
import RouteGuard from "./features/auth/RouteGuard"
import DevRoleSwitcher from "./features/auth/DevRoleSwitcher"
import NotificationPage from "./features/notification/ui/NotificationPage"
import ApprovalManagementPage from "./features/incomplete/ui/ApprovalManagementPage"
import AccountApprovalPage from "./features/account-approval/ui/AccountApprovalPage"
import InspectionOrdersPage from "./features/inspection-orders/ui/InspectionOrdersPage"
import ReportPage from "./features/report/ui/ReportPage"

function App() {

  return (
    <BrowserRouter>
      <DevRoleSwitcher />
      <Routes>
        <Route path="/signup" element={<SignupForm/>} />
        <Route path="/login" element={<LoginForm/>} />

        <Route element={<RouteGuard />}>
          <Route element={<Layout/>}>
            <Route path="/" element={<div className="p-6">홈</div>} />
            <Route path="/notifications" element={<NotificationPage />} />

            <Route element={<RouteGuard roles={["ADMIN"]} />}>
              <Route path="/dashboard" element={<div className="p-6">대시보드</div>} />
              <Route path="/userSearch" element={<div className="p-6">사용자 검색</div>} />
              <Route path="/approval" element={<AccountApprovalPage />} />
              <Route path="/reports" element={<div className="p-6">검사보고서</div>} />
            </Route>

            <Route element={<RouteGuard roles={["QUALITY_ADMIN"]} />}>
              <Route path="/inspection-orders" element={<InspectionOrdersPage />} />
              <Route path="/approval-management" element={<ApprovalManagementPage />} />
              <Route path="/qm-reports" element={<ReportPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
