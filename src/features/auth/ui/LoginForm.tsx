import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
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

  const isMobile = useMediaQuery("(max-width: 767px)");
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  // 계정 전환의 "다른 계정 추가"로 들어온 경우 — 아직 기존 계정으로 로그인된
  // 상태이므로, 잘못 눌렀을 때 되돌아갈 수 있어야 한다.
  const isAddingAccount =
    (location.state as { addAccount?: boolean } | null)?.addAccount === true &&
    user !== null;

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

  return (
    <>
      {isAddingAccount && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="fixed left-4 top-4 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
        >
          <Icon icon="solar:alt-arrow-left-linear" width={18} height={18} />
          {user?.name} 계정으로 돌아가기
        </button>
      )}
      {isMobile ? <LoginFormMobile {...props} /> : <LoginFormWeb {...props} />}
    </>
  );
}
