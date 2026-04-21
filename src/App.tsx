import SignupForm from "./features/auth/ui/SignupForm"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm"
import Layout from "./components/layout/Layout"

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupForm/>} />
        <Route path="/login" element={<LoginForm/>} />

        <Route element={<Layout/>}>
          <Route path="/" element={<div className="p-6">홈</div>} />
          <Route path="/dashboard" element={<div className="p-6">대시보드</div>} />
          <Route path="/userSearch" element={<div className="p-6">사용자 검색</div>} />
          <Route path="/approval" element={<div className="p-6">가입승인</div>} />
          <Route path="/reports" element={<div className="p-6">검사보고서</div>} />
          <Route path="/calendar" element={<div className="p-6">캘린더</div>} />
          <Route path="/settings" element={<div className="p-6">설정</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
