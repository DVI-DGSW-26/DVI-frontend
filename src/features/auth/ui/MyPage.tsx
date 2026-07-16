import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";
import { useAuth } from "../AuthContext";
import { changeMyPassword } from "../api";
import type { Role, UserStatus } from "../api";
import Toast from "../../inspection/ui/Toast";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "통합 관리자",
  QUALITY_ADMIN: "품질 관리자",
  PRODUCTION: "생산자",
  PRODUCTION_MANAGER: "생산 관리자",
  QUALITY: "품질 담당자",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "활성",
  PENDING: "승인 대기",
  INACTIVE: "비활성",
};

const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE: "bg-[#DCFCE7] text-[#15803D]",
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  INACTIVE: "bg-[#F3F4F6] text-[#6B7280]",
};

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pwOpen, setPwOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleLogout = () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-8 text-sm text-[#6B7280]">
        사용자 정보를 불러올 수 없습니다.
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
            {ROLE_LABEL[user.role]}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-[#212121]">
          계정 정보
        </h2>
        <dl className="divide-y divide-gray-100 px-5">
          <InfoRow label="아이디" value={user.loginId} />
          <InfoRow label="이름" value={user.name} />
          <InfoRow label="역할" value={ROLE_LABEL[user.role]} />
          <InfoRow
            label="상태"
            value={
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[user.status]}`}
              >
                {STATUS_LABEL[user.status]}
              </span>
            }
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setPwOpen((v) => !v)}
          aria-expanded={pwOpen}
          className="flex w-full items-center justify-between border-b border-gray-100 px-5 py-3 text-left text-sm font-semibold text-[#212121]"
        >
          <span>비밀번호 변경</span>
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#EF4444] text-sm font-semibold text-white transition-colors hover:bg-[#DC2626]"
        >
          <Icon icon="mdi:logout" width={18} height={18} />
          로그아웃
        </button>
      </section>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function ChangePasswordForm({
  onDone,
  onError,
}: {
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
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
      onDone("비밀번호가 변경되었습니다");
    } catch (err) {
      onError(toErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
      <Field
        id="current-password"
        label="현재 비밀번호"
        value={current}
        onChange={setCurrent}
        disabled={isSubmitting}
        autoComplete="current-password"
      />
      <Field
        id="new-password"
        label="새 비밀번호 (6자 이상)"
        value={next}
        onChange={setNext}
        disabled={isSubmitting}
        autoComplete="new-password"
        hint={
          next.length === 0
            ? undefined
            : !longEnough
              ? { text: "6자 이상이어야 합니다.", tone: "warn" }
              : undefined
        }
      />
      <Field
        id="confirm-password"
        label="새 비밀번호 확인"
        value={confirm}
        onChange={setConfirm}
        disabled={isSubmitting}
        autoComplete="new-password"
        hint={
          confirm.length === 0
            ? undefined
            : !matches
              ? { text: "비밀번호가 일치하지 않습니다.", tone: "warn" }
              : { text: "일치합니다.", tone: "ok" }
        }
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 h-11 rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
      >
        {isSubmitting ? "변경 중..." : "비밀번호 변경"}
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

function toErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { code?: string; message?: string }
      | undefined;
    const code = data?.code;
    if (code === "PASSWORD_MISMATCH") return "현재 비밀번호가 일치하지 않습니다.";
    if (code === "PASSWORD_TOO_SHORT") return "새 비밀번호는 6자 이상이어야 합니다.";
    return data?.message ?? "비밀번호 변경 중 오류가 발생했습니다.";
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
