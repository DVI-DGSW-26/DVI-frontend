import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import authBackground from "../../../assets/authBackground.png";
import authLogo from "../../../assets/authLogo.svg";
import Logo from "../../../assets/Logo.svg";
import Button from "../../../components/shared/Button";
import type { LoginFormProps } from "./LoginForm";

export default function LoginFormWeb({
  username,
  setUsername,
  password,
  setPassword,
  onSubmit,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full">
      {/* 왼쪽 고정 이미지 */}
      <div className="fixed left-0 top-0 w-1/2 h-screen overflow-hidden lg:block hidden">
        <img src={authBackground} className="w-full h-full object-cover" />
        <img src={authLogo} className="absolute top-10 left-8 w-44" />
        <div className="absolute inset-0 flex flex-col justify-center left-12 gap-6">
          <div className="flex flex-col gap-0 leading-tight">
            <span className="text-[40px] xl:text-[46px] text-white font-semibold">A social enterprise that cares about </span>
            <span className="text-[64px] xl:text-[70px] text-white font-black leading-tight">people, technology, and<br/>the environment</span>
          </div>
          <span className="text-[18px] xl:text-[24px] font-medium text-white">
            사람, 기술, 환경을 중시하는 사회적 기업
          </span>
        </div>
      </div>

      {/* 오른쪽 스크롤 영역 */}
      <div className="fixed right-0 top-0 w-full lg:w-1/2 h-screen bg-white flex flex-col items-center justify-center">
        <div className="flex flex-col w-full max-w-md px-6 lg:px-0 xl:max-w-xl 2xl:max-w-2xl">
          <div
            className="flex flex-col items-center gap-2"
            style={{ marginBottom: "60px" }}
          >
            <img src={Logo} className="w-60 xl:w-90" />
          </div>
          <div className="flex flex-col gap-3">
            <input
              placeholder="아이디를 입력하세요."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <div className="relative">
              <input
                placeholder="비밀번호를 입력하세요."
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "13px" }}
                className="w-full border border-[#A8A8A8] rounded-lg h-12 xl:h-15 pr-12 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A8A8] hover:text-[#931B82] transition-colors"
              >
                <Icon
                  icon={showPassword ? "mdi:eye-outline" : "mdi:eye-off-outline"}
                  width="24"
                />
              </button>
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="w-4 h-4 rounded border-[#A8A8A8] accent-[#931B82] cursor-pointer"
              />
              <span className="text-sm text-[#737373]">로그인 유지</span>
            </label>
            <div style={{ marginTop: "35px" }}>
              <Button onClick={onSubmit}>로그인</Button>
            </div>
            <div className="flex flex-row justify-center gap-1 mt-5 text-sm">
              <span className="text-[#A8A8A8]">계정이 없으신가요?</span>
              <span className="text-[#931B82] cursor-pointer" onClick={() => navigate("/signup")}>회원가입 하기</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
