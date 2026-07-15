import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import Select from "react-select";
import Logo from "../../../assets/Logo.svg";
import Button from "../../../components/shared/Button";
import type { SignupFormProps } from "./SignupForm";

const departmentOptions = [
  { value: "QUALITY", label: "품질" },
  { value: "PRODUCTION", label: "생산" }
];

const selectStyles = {
  control: (base: any) => ({
    ...base,
    height: "60px",
    minHeight: "60px",
    borderColor: "#A8A8A8",
    borderRadius: "8px",
    paddingLeft: "5px",
    boxShadow: "none",
    "&:hover": { borderColor: "#A8A8A8" },
  }),
  dropdownIndicator: (base: any) => ({ ...base, paddingRight: "12px" }),
  indicatorSeparator: () => ({ display: "none" }),
};

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep((step - 1) as 1 | 2);
  };

  const step1Valid =
    username.trim() !== "" &&
    password.trim() !== "" &&
    confirmPassword.trim() !== "";
  const step2Valid = name.trim() !== "" && department !== "";

  const inputBaseStyle = {
    position: "absolute" as const,
    left: "24px",
    width: "calc(100% - 48px)",
    paddingLeft: "13px",
  };
  const inputClass =
    "h-[60px] border border-[#A8A8A8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#931B82]";

  return (
    <div className="relative min-h-dvh w-full bg-white overflow-hidden">
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
          <div
            className="relative"
            style={{
              position: "absolute",
              left: "24px",
              top: "480px",
              width: "calc(100% - 48px)",
            }}
          >
            <input
              placeholder="비밀번호를 재입력하세요."
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: "13px", paddingRight: "48px" }}
              className={`${inputClass} w-full`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A8A8A8]"
              aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보이기"}
            >
              <Icon
                icon={showConfirmPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                width="20"
              />
            </button>
          </div>

          <div
            style={{
              position: "absolute",
              left: "24px",
              top: "566px",
              width: "calc(100% - 48px)",
            }}
          >
            <Button onClick={() => setStep(2)} disabled={!step1Valid}>
              다음
            </Button>
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
          <div
            style={{
              position: "absolute",
              left: "24px",
              top: "412px",
              width: "calc(100% - 48px)",
            }}
          >
            <Select
              placeholder="부서를 선택하세요."
              options={departmentOptions}
              value={departmentOptions.find((o) => o.value === department)}
              onChange={(selected) => setDepartment(selected?.value ?? "")}
              styles={selectStyles}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: "24px",
              top: "566px",
              width: "calc(100% - 48px)",
            }}
          >
            <Button onClick={() => setStep(3)} disabled={!step2Valid}>
              다음
            </Button>
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
