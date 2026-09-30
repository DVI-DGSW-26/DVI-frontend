import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";
import { useAuth } from "../AuthContext";
import { changeMyPassword } from "../api";
import type { UserStatus } from "../api";
import { canSwitchAccounts } from "../constants";
import AccountSwitcher from "./AccountSwitcher";
import Toast from "../../inspection/ui/Toast";
import type { Lang } from "../../../lib/i18n";

const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE: "bg-[#DCFCE7] text-[#15803D]",
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  INACTIVE: "bg-[#F3F4F6] text-[#6B7280]",
};

export default function MyPage() {
  const { t, i18n } = useTranslation(["auth", "common"]);
  const { user, accounts, logout } = useAuth();
  const navigate = useNavigate();

  const [pwOpen, setPwOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showSwitcher = canSwitchAccounts(user, accounts);

  const handleLogout = () => {
    // 로그아웃은 이 기기에 저장된 계정을 전부 해제한다. 전환용으로 남겨둔 다른
    // 계정만 살아남으면 그 세션으로 몰래 들어갈 수 있으므로 함께 정리한다.
    const message =
      accounts.length > 1
        ? t("myPage.logoutConfirmMulti", { n: accounts.length })
        : t("myPage.logoutConfirm");
    if (!window.confirm(message)) return;
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-8 text-sm text-[#6B7280]">
        {t("myPage.loadError")}
      </div>
    );
  }

  const initial = user.name?.[0] ?? "?";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <section className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F3E8F7] text-2xl font-semibold text-[#931B82] md:h-20 md:w-20 md:text-3xl">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-[#212121] md:text-xl">
            {user.name}
          </div>
          <div className="mt-0.5 truncate text-sm text-[#6B7280]">
            {t(`roles.${user.role}`, { ns: "common" })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
          {t("myPage.accountInfo")}
        </h2>
        <dl className="divide-y divide-gray-100 px-5">
          <InfoRow label={t("myPage.id")} value={user.loginId} />
          <InfoRow label={t("myPage.name")} value={user.name} />
          <InfoRow
            label={t("myPage.role")}
            value={t(`roles.${user.role}`, { ns: "common" })}
          />
          <InfoRow
            label={t("myPage.statusLabel")}
            value={
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[user.status]}`}
              >
                {t(`myPage.status.${user.status}`)}
              </span>
            }
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
          {t("myPage.language")}
        </h2>
        <div className="flex gap-2 px-5 py-4">
          <LanguageButton
            lang="ko"
            label="한국어"
            active={i18n.resolvedLanguage !== "en"}
            onSelect={(lang) => i18n.changeLanguage(lang)}
          />
          <LanguageButton
            lang="en"
            label="English"
            active={i18n.resolvedLanguage === "en"}
            onSelect={(lang) => i18n.changeLanguage(lang)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setPwOpen((v) => !v)}
          aria-expanded={pwOpen}
          className="flex w-full items-center justify-between border-b border-gray-100 px-5 py-3 text-left text-sm font-semibold text-[#212121]"
        >
          <span>{t("myPage.password.title")}</span>
          <Icon
            icon={pwOpen ? "mdi:chevron-up" : "mdi:chevron-down"}
            width={18}
            height={18}
            className="text-[#6B7280]"
          />
        </button>
        {pwOpen && (
          <ChangePasswordForm
            onDone={(msg) => {
              setToast(msg);
              setPwOpen(false);
            }}
            onError={setToast}
          />
        )}
      </section>

      {showSwitcher && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
            {t("myPage.accountSwitch")}
          </h2>
          <AccountSwitcher />
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#EF4444] text-sm font-semibold text-white transition-colors hover:bg-[#DC2626]"
        >
          <Icon icon="mdi:logout" width={18} height={18} />
          {t("myPage.logout")}
        </button>
      </section>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function LanguageButton({
  lang,
  label,
  active,
  onSelect,
}: {
  lang: Lang;
  label: string;
  active: boolean;
  onSelect: (lang: Lang) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lang)}
      aria-pressed={active}
      className={`h-10 flex-1 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? "border-[#931B82] bg-[#F3E8F7] text-[#931B82]"
          : "border-gray-200 bg-white text-[#6B7280] hover:bg-[#FAF5FB]"
      }`}
    >
      {label}
    </button>
  );
}

function ChangePasswordForm({
  onDone,
  onError,
}: {
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation("auth");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matches = next === confirm;
  const longEnough = next.length >= 6;
  const canSubmit =
    current.length > 0 && longEnough && matches && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await changeMyPassword({
        currentPassword: current,
        newPassword: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone(t("myPage.password.changed"));
    } catch (err) {
      onError(toErrorMessage(err, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
      <Field
        id="current-password"
        label={t("myPage.password.current")}
        value={current}
        onChange={setCurrent}
        disabled={isSubmitting}
        autoComplete="current-password"
      />
      <Field
        id="new-password"
        label={t("myPage.password.new")}
        value={next}
        onChange={setNext}
        disabled={isSubmitting}
        autoComplete="new-password"
        hint={
          next.length === 0
            ? undefined
            : !longEnough
              ? { text: t("myPage.password.tooShort"), tone: "warn" }
              : undefined
        }
      />
      <Field
        id="confirm-password"
        label={t("myPage.password.confirm")}
        value={confirm}
        onChange={setConfirm}
        disabled={isSubmitting}
        autoComplete="new-password"
        hint={
          confirm.length === 0
            ? undefined
            : !matches
              ? { text: t("myPage.password.mismatch"), tone: "warn" }
              : { text: t("myPage.password.match"), tone: "ok" }
        }
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 h-11 rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
      >
        {isSubmitting
          ? t("myPage.password.submitting")
          : t("myPage.password.submit")}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  hint?: { text: string; tone: "ok" | "warn" };
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[#6B7280]"
      >
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
      />
      {hint && (
        <p
          className={`mt-1 text-xs ${
            hint.tone === "ok" ? "text-[#15803D]" : "text-[#B45309]"
          }`}
        >
          {hint.text}
        </p>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-[#6B7280]">{label}</dt>
      <dd className="ml-3 min-w-0 truncate text-right text-sm font-medium text-[#212121]">
        {value}
      </dd>
    </div>
  );
}

function toErrorMessage(err: unknown, t: TFunction<"auth">): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { code?: string; message?: string }
      | undefined;
    const code = data?.code;
    if (code === "PASSWORD_MISMATCH")
      return t("myPage.password.errorCurrentMismatch");
    if (code === "PASSWORD_TOO_SHORT")
      return t("myPage.password.errorTooShort");
    return data?.message ?? t("myPage.password.errorGeneric");
  }
  if (err instanceof Error) return err.message;
  return t("myPage.password.errorUnknown");
}
