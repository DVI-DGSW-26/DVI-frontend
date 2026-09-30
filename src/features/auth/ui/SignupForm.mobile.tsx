import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import Select, { type StylesConfig } from "react-select";
import Logo from "../../../assets/Logo.svg";
import Button from "../../../components/shared/Button";
import type { SignupFormProps } from "./SignupForm";

type DepartmentOption = { value: string; label: string };

const selectStyles: StylesConfig<DepartmentOption, false> = {
  control: (base) => ({
    ...base,
    height: "60px",
    minHeight: "60px",
    borderColor: "#A8A8A8",
    borderRadius: "8px",
    paddingLeft: "5px",
    boxShadow: "none",
    "&:hover": { borderColor: "#A8A8A8" },
  }),
  dropdownIndicator: (base) => ({ ...base, paddingRight: "12px" }),
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
  const { t } = useTranslation("auth");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const departmentOptions: DepartmentOption[] = [
    { value: "QUALITY", label: t("signup.departments.QUALITY") },
    { value: "PRODUCTION", label: t("signup.departments.PRODUCTION") },
  ];

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
          aria-label={t("signup.back")}
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
            {t("signup.step1TitleLine1")}
            <br />
            {t("signup.step1TitleLine2")}
          </h1>

          <input
            placeholder={t("fields.idPlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ ...inputBaseStyle, top: "344px" }}
            className={inputClass}
          />
          <input
            placeholder={t("fields.passwordPlaceholder")}
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
              placeholder={t("fields.passwordConfirmPlaceholder")}
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
              aria-label={
                showConfirmPassword
                  ? t("fields.hidePassword")
                  : t("fields.showPassword")
              }
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
              {t("signup.next")}
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
            {t("signup.step2TitleLine1")}
            <br />
            {t("signup.step2TitleLine2")}
          </h1>

          <input
            placeholder={t("fields.namePlaceholder")}
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
            <Select<DepartmentOption, false>
              placeholder={t("fields.departmentPlaceholder")}
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
              {t("signup.next")}
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
            <Button onClick={onSubmit}>{t("signup.requestApproval")}</Button>
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
