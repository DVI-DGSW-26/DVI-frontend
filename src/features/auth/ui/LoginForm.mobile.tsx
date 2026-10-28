import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import BrandLogo from "../../../components/shared/BrandLogo";
import Button from "../../../components/shared/Button";
import type { LoginFormProps } from "./LoginForm";

export default function LoginFormMobile({
  username,
  setUsername,
  password,
  setPassword,
  onSubmit,
}: LoginFormProps) {
  const { t } = useTranslation("auth");
  const [showPassword, setShowPassword] = useState(false);
  // 기본값 true — 체크 해제 시에만 sessionStorage 로 저장 (브라우저 종료 시 로그아웃).
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const navigate = useNavigate();

  return (
    <form
      className="relative min-h-dvh w-full bg-surface"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(keepLoggedIn);
      }}
    >
      <div
        className="absolute flex flex-col items-center left-1/2 -translate-x-1/2"
        style={{ top: "176px" }}
      >
        <BrandLogo style={{ width: "300px", height: "auto" }} />
      </div>

      <input
        placeholder={t("fields.idPlaceholder")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          position: "absolute",
          left: "30px",
          top: "344px",
          width: "calc(100% - 60px)",
          paddingLeft: "13px",
        }}
        className="border border-line-strong rounded-lg h-15 focus:outline-none focus:ring-1 focus:ring-brand"
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
          placeholder={t("fields.passwordPlaceholder")}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ paddingLeft: "13px" }}
          className="w-full border border-line-strong rounded-lg h-15 pr-12 focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-brand-fg transition-colors"
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
          className="w-4 h-4 rounded border-line-strong accent-brand cursor-pointer"
        />
        <span className="text-sm text-fg-subtle">{t("login.keepLoggedIn")}</span>
      </label>

      <div
        style={{
          position: "absolute",
          left: "30px",
          top: "554px",
          width: "calc(100% - 60px)",
        }}
      >
        <Button type="submit">{t("login.submit")}</Button>
      </div>

      <div
        className="absolute flex flex-row gap-1 text-sm left-1/2 -translate-x-1/2"
        style={{ top: "635px" }}
      >
        <span className="text-fg-subtle">{t("login.noAccount")}</span>
        <span
          className="text-brand-fg cursor-pointer"
          onClick={() => navigate("/signup")}
        >
          {t("login.signupLinkMobile")}
        </span>
      </div>
    </form>
  );
}
