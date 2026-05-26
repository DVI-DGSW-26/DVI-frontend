import SignupForm from "./features/auth/ui/SignupForm"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm"
import Layout from "./components/layout/Layout"
import RouteGuard from "./features/auth/RouteGuard"
import NotificationPage from "./features/notification/ui/NotificationPage"
import ScanPage from "./features/inspection/ui/ScanPage"
import StartInspectionPage from "./features/inspection/ui/StartInspectionPage"
import InspectionDetailPage from "./features/inspection/ui/InspectionDetailPage"
import InspectionMeasurePage from "./features/inspection/ui/InspectionMeasurePage"
import InspectionResultPage from "./features/inspection/ui/InspectionResultPage"

import QualitySystemStatusPage from "./features/cross-check/ui/QualitySystemStatusPage"
import CrossCheckPendingPage from "./features/cross-check/ui/CrossCheckPendingPage"
import CrossCheckMeasurePage from "./features/cross-check/ui/CrossCheckMeasurePage"
import CrossCheckResultPage from "./features/cross-check/ui/CrossCheckResultPage"
import QualityHomePage from "./features/cross-check/ui/QualityHomePage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/login" element={<LoginForm />} />

        <Route element={<RouteGuard />}>
          <Route element={<Layout />}>
            <Route element={<RouteGuard roles={["QUALITY"]} />}>
              <Route path="/" element={<QualityHomePage />} />
              <Route path="/notifications" element={<NotificationPage />} />

              <Route
                path="/quality-status"
                element={<QualitySystemStatusPage />}
              />

              <Route
                path="/cross-checks"
                element={<CrossCheckPendingPage />}
              />

              <Route
                path="/cross-check/:crossCheckId/measure"
                element={<CrossCheckMeasurePage />}
              />

              <Route
                path="/cross-check/:crossCheckId/result"
                element={<CrossCheckResultPage />}
              />

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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
