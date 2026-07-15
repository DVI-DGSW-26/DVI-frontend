import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import Logo from "../../../assets/Logo.svg";
import Button from "../../../components/shared/Button";
import type { LoginFormProps } from "./LoginForm";

export default function LoginFormMobile({
  username,
  setUsername,
  password,
  setPassword,
  onSubmit,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  // 기본값 true — 체크 해제 시에만 sessionStorage 로 저장 (브라우저 종료 시 로그아웃).
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const navigate = useNavigate();

  return (
    <form
      className="relative min-h-dvh w-full bg-white"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(keepLoggedIn);
      }}
    >
      <div
        className="absolute flex flex-col items-center left-1/2 -translate-x-1/2"
        style={{ top: "176px" }}
      >
        <img src={Logo} style={{ width: "360px", height: "68px" }} />
      </div>

      <input
        placeholder="아이디를 입력하세요."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          position: "absolute",
          left: "30px",
          top: "344px",
          width: "calc(100% - 60px)",
          paddingLeft: "13px",
        }}
        className="border border-[#A8A8A8] rounded-lg h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
      />

      <div
        style={{
          position: "absolute",
          left: "30px",
          top: "418px",
          width: "calc(100% - 60px)",
        }}
      >
        <input
          placeholder="비밀번호를 입력하세요."
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ paddingLeft: "13px" }}
          className="w-full border border-[#A8A8A8] rounded-lg h-15 pr-12 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A8A8] hover:text-[#931B82] transition-colors"
        >
          <Icon
            icon={showPassword ? "mdi:eye-outline" : "mdi:eye-off-outline"}
            width="22"
          />
        </button>
      </div>

      <label
        className="absolute flex items-center gap-2 cursor-pointer select-none"
        style={{ left: "32px", top: "494px" }}
      >
        <input
          type="checkbox"
          checked={keepLoggedIn}
          onChange={(e) => setKeepLoggedIn(e.target.checked)}
          className="w-4 h-4 rounded border-[#A8A8A8] accent-[#931B82] cursor-pointer"
        />
        <span className="text-sm text-[#A8A8A8]">로그인 유지</span>
      </label>

      <div
        style={{
          position: "absolute",
          left: "30px",
          top: "554px",
          width: "calc(100% - 60px)",
        }}
      >
        <Button type="submit">로그인</Button>
      </div>

      <div
        className="absolute flex flex-row gap-1 text-sm left-1/2 -translate-x-1/2"
        style={{ top: "635px" }}
      >
        <span className="text-[#A8A8A8]">계정이 없으신가요?</span>
        <span
          className="text-[#931B82] cursor-pointer"
          onClick={() => navigate("/signup")}
        >
          신규 회원 가입
        </span>
      </div>
    </form>
  );
}
