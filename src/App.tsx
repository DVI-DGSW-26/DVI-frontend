import SignupForm from "./features/auth/ui/SignupForm"
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupForm/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
