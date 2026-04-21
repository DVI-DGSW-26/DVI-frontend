import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import Logo from "../../../assets/Logo.svg";
import Button from "../../../components/Button";
import type { SignupFormProps } from "./SignupForm";

export default function SignupFormMobile({
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
  onSubmit,
}: SignupFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const navigate = useNavigate();

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep((step - 1) as 1 | 2);
  };

  const inputBaseStyle = {
    position: "absolute" as const,
    left: "24px",
    width: "calc(100% - 48px)",
    paddingLeft: "13px",
  };
  const inputClass =
    "h-[60px] border border-[#A8A8A8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#931B82]";

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      {step < 3 && (
        <button
          type="button"
          onClick={handleBack}
          className="absolute text-[#212121]"
          style={{ left: "39px", top: "69px" }}
          aria-label="뒤로"
        >
          <Icon icon="ic:round-arrow-back-ios" width="24" />
        </button>
      )}

      {step === 1 && (
        <>
          <h1
            className="absolute text-xl font-bold leading-snug text-[#212121]"
            style={{ left: "48px", top: "139px" }}
          >
            아이디와 비밀번호를
            <br />
            입력해주세요.
          </h1>

          <input
            placeholder="아이디를 입력하세요."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ ...inputBaseStyle, top: "344px" }}
            className={inputClass}
          />
          <input
            placeholder="비밀번호를 입력하세요."
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputBaseStyle, top: "412px" }}
            className={inputClass}
          />
          <input
            placeholder="비밀번호를 재입력하세요."
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ ...inputBaseStyle, top: "480px" }}
            className={inputClass}
          />

          <div
            style={{
              position: "absolute",
              left: "24px",
              top: "566px",
              width: "calc(100% - 48px)",
            }}
          >
            <Button onClick={() => setStep(2)}>다음</Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1
            className="absolute text-xl font-bold leading-snug text-[#212121]"
            style={{ left: "48px", top: "139px" }}
          >
            이름과 부서를
            <br />
            입력해주세요.
          </h1>

          <input
            placeholder="이름을 입력하세요."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...inputBaseStyle, top: "344px" }}
            className={inputClass}
          />
          <input
            placeholder="부서를 입력하세요 (예: 품질, 생산)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{ ...inputBaseStyle, top: "412px" }}
            className={inputClass}
          />

          <div
            style={{
              position: "absolute",
              left: "24px",
              top: "566px",
              width: "calc(100% - 48px)",
            }}
          >
            <Button onClick={() => setStep(3)}>다음</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div
            className="absolute flex flex-col items-center left-1/2 -translate-x-1/2"
            style={{ top: "300px" }}
          >
            <img src={Logo} style={{ width: "300px", height: "57px" }} />
            <span className="mt-3 text-sm font-semibold text-[#931B82]">
              정밀 생산으로 완성되는 기술력
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              left: "24px",
              top: "566px",
              width: "calc(100% - 48px)",
            }}
          >
            <Button onClick={onSubmit}>관리자 승인 요청</Button>
          </div>
        </>
      )}

      <div
        className="absolute flex gap-2 left-1/2 -translate-x-1/2"
        style={{ top: "821px" }}
      >
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`w-2 h-2 rounded-full ${
              step === n ? "bg-[#931B82]" : "bg-[#E5E7EB]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
