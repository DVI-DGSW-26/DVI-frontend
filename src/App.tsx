import SignupForm from "./features/auth/ui/SignupForm"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./features/auth/ui/LoginForm"

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupForm/>} />
        <Route path="/login" element={<LoginForm/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
