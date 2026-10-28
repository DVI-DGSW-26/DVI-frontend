import { useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import LanguageToggle from "../../../components/layout/LanguageToggle";
import ThemeToggle from "../../../components/layout/ThemeToggle";
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
  const location = useLocation();
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
      // 세션이 끊겨 RouteGuard 가 보낸 경우(알림 링크 등) 원래 가려던 화면으로 돌려보낸다.
      // 권한이 없는 화면이면 RouteGuard 가 다시 홈으로 보낸다. 뒤로가기로 로그인 폼이
      // 다시 나오지 않도록 replace.
      const from = (location.state as { from?: Location } | null)?.from;
      const target =
        from && from.pathname !== "/" && from.pathname !== "/login"
          ? `${from.pathname}${from.search}${from.hash}`
          : (ROLE_HOME[me.role] ?? "/");
      navigate(target, { replace: true });
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
      {/* 로그인 전 화면이라 앱 헤더가 없다 — 테마·언어 버튼을 오른쪽 위에 띄워 둔다. */}
      <div className="fixed right-3 top-3 z-50 flex items-center rounded-full bg-surface/90 border border-edge">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </>
  );
}
