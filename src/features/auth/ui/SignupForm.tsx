import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import SignupFormWeb from "./SignupForm.web";
import SignupFormMobile from "./SignupForm.mobile";

export interface SignupFormProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  onSubmit: () => void;
}

interface SignupRequest {
  username: string;
  password: string;
  name: string;
  department: string;
}

const SIGNUP_ENDPOINT = "/api/auth/signup";

async function requestSignup(body: SignupRequest): Promise<void> {
  const response = await fetch(SIGNUP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Signup failed: ${response.status}`);
  }
}

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");

  const isMobile = useMediaQuery("(max-width: 767px)");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const body: SignupRequest = { username, password, name, department };

    try {
      // TODO: 서버 연결 준비되면 주석 해제
      // await requestSignup(body);
      void requestSignup;
      void body;

      alert("관리자 승인 요청이 전송되었습니다.");
      navigate("/login");
    } catch (err) {
      alert("요청 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const props: SignupFormProps = {
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    name,
    setName,
    department,
    setDepartment,
    onSubmit: handleSubmit,
  };

  return isMobile ? <SignupFormMobile {...props} /> : <SignupFormWeb {...props} />;
}
