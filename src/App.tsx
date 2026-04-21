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
          <Route path="/calendar" element={<div className="p-6">캘린더</div>} />
          <Route path="/settings" element={<div className="p-6">설정</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
