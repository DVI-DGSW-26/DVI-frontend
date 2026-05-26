import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { AuthError } from "../api";
import type { Role } from "../api";
import { useAuth } from "../AuthContext";
import LoginFormWeb from "./LoginForm.web";
import LoginFormMobile from "./LoginForm.mobile";

const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard",
  QUALITY_ADMIN: "/inspection-orders",
  PRODUCTION: "/",
  QUALITY: "/",
};

export interface LoginFormProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onSubmit: () => void;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isMobile = useMediaQuery("(max-width: 767px)");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async () => {
    try {
      const me = await login({
        loginId: username.trim(),
        password: password.trim(),
      });
      navigate(ROLE_HOME[me.role] ?? "/");
    } catch (err) {
      if (err instanceof AuthError) {
        alert(err.message);
      } else {
        console.error("[login] failed:", err);
        alert("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    }
  };

  const props: LoginFormProps = {
    username,
    setUsername,
    password,
    setPassword,
    onSubmit: handleSubmit,
  };

  return isMobile ? <LoginFormMobile {...props} /> : <LoginFormWeb {...props} />;
}
