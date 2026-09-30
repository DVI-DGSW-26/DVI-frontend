import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import LanguageToggle from "../../../components/layout/LanguageToggle";
import { AuthError } from "../api";
import { useAuth } from "../AuthContext";
import { ROLE_HOME } from "../constants";
import LoginFormWeb from "./LoginForm.web";
import LoginFormMobile from "./LoginForm.mobile";

export interface LoginFormProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  // keepLoggedIn=true → localStorage (브라우저 종료 후에도 자동 로그인 유지)
  // keepLoggedIn=false → sessionStorage (탭 닫으면 로그아웃)
  onSubmit: (keepLoggedIn: boolean) => void;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { t } = useTranslation("auth");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (keepLoggedIn: boolean) => {
    try {
      const me = await login(
        {
          loginId: username.trim(),
          password: password.trim(),
        },
        keepLoggedIn,
      );
      navigate(ROLE_HOME[me.role] ?? "/");
    } catch (err) {
      if (err instanceof AuthError) {
        alert(err.message);
      } else {
        console.error("[login] failed:", err);
        alert(t("login.error"));
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

  return (
    <>
      {isMobile ? <LoginFormMobile {...props} /> : <LoginFormWeb {...props} />}
      {/* 로그인 전 화면이라 앱 헤더가 없다 — 언어 버튼을 오른쪽 위에 띄워 둔다. */}
      <div className="fixed right-3 top-3 z-50 rounded-full bg-white/90">
        <LanguageToggle />
      </div>
    </>
  );
}
