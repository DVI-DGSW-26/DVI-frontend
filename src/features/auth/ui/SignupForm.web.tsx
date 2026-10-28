import { useTranslation } from "react-i18next";
import authBackground from "../../../assets/authBackground.png";
import BrandLogo from "../../../components/shared/BrandLogo";
import Select, { type StylesConfig } from "react-select";
import Button from "../../../components/shared/Button";
import type { SignupFormProps } from "./SignupForm";
import { selectTheme } from "../../../lib/selectTheme";

type DepartmentOption = { value: string; label: string };

const selectStyles: StylesConfig<DepartmentOption, false> = {
  control: (base) => ({
    ...base,
    height: "48px",
    minHeight: "48px",
    "@media (min-width: 1280px)": {
      height: "60px",
      minHeight: "60px",
    },
    borderColor: "var(--color-line-strong)",
    borderRadius: "6px",
    paddingLeft: "5px",
    boxShadow: "none",
    "&:hover": { borderColor: "var(--color-line-strong)" },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    paddingRight: "12px",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};

export default function SignupFormWeb({
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
  const { t, i18n } = useTranslation("auth");

  const departmentOptions: DepartmentOption[] = [
    { value: "PRODUCTION", label: t("signup.departments.PRODUCTION") },
    { value: "QUALITY", label: t("signup.departments.QUALITY") },
  ];

  return (
    <div className="flex h-dvh w-full">
      {/* 왼쪽 고정 이미지 */}
      <div className="fixed left-0 top-0 w-1/2 h-dvh overflow-hidden lg:block hidden">
        <img src={authBackground} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex flex-col justify-center left-12 gap-6">
          <div className="flex flex-col gap-0 leading-tight">
            <span className="text-[40px] xl:text-[46px] text-white font-semibold">A social enterprise that cares about </span>
            <span className="text-[58px] xl:text-[64px] text-white font-black leading-tight">people, technology, and<br/>the environment</span>
          </div>
          {/* 위 영문 문구의 한국어 번역 — 영어 화면에서는 뺀다. */}
          {i18n.language.startsWith("ko") && (
            <span className="text-[18px] xl:text-[24px] font-medium text-white">
              사람, 기술, 환경을 중시하는 사회적 기업
            </span>
          )}
        </div>
      </div>

      {/* 오른쪽 스크롤 영역 */}
      <div className="fixed right-0 top-0 w-full lg:w-1/2 h-dvh bg-surface flex flex-col items-center justify-center">
        <div className="flex flex-col w-full max-w-md px-6 lg:px-0 xl:max-w-xl 2xl:max-w-2xl">
          <div
            className="flex flex-col items-center gap-2"
            style={{ marginBottom: "60px" }}
          >
            <BrandLogo className="w-60 xl:w-90" />
          </div>
          <div className="flex flex-col gap-3">
            <input
              placeholder={t("fields.idPlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-line-strong rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <input
              placeholder={t("fields.passwordPlaceholder")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-line-strong rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <input
              placeholder={t("fields.passwordConfirmPlaceholder")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-line-strong rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <div className="flex gap-4">
              <input
                placeholder={t("fields.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: "13px" }}
                className="w-1/2 border border-line-strong rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <div className="w-1/2">
                <Select<DepartmentOption, false>
                  theme={selectTheme}
                  placeholder={t("fields.departmentPlaceholder")}
                  options={departmentOptions}
                  value={departmentOptions.find((o) => o.value === department)}
                  onChange={(selected) => setDepartment(selected?.value ?? "")}
                  styles={selectStyles}
                />
              </div>
            </div>
            <div style={{ marginTop: "35px" }}>
              <Button onClick={onSubmit}>{t("signup.submit")}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
