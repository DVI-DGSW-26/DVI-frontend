import SignupForm from "./components/auth/SignupForm"
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
