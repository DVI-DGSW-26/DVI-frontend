import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { signup, type Department } from "../api";
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
    if (department !== "PRODUCTION" && department !== "QUALITY") {
      alert("부서를 선택해주세요.");
      return;
    }

    try {
      await signup({
        loginId: username,
        password,
        name,
        department: department as Department,
      });
      alert("관리자 승인 요청이 전송되었습니다.");
      navigate("/login");
    } catch (err) {
      console.error(err);
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
