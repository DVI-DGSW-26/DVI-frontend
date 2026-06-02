import { useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import Select, { type StylesConfig } from "react-select";
import { useCreateUser } from "../api";
import type { Role } from "../../auth/type/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface RoleOption {
  value: Role;
  label: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "PRODUCTION", label: "생산 담당자" },
  { value: "QUALITY", label: "품질 담당자" },
  { value: "QUALITY_ADMIN", label: "품질 관리자" },
  { value: "ADMIN", label: "통합 관리자" },
];

const selectStyles: StylesConfig<RoleOption, false> = {
  control: (base, state) => ({
    ...base,
    height: "44px",
    minHeight: "44px",
    borderColor: state.isFocused ? "#931B82" : "#A8A8A8",
    borderRadius: "6px",
    boxShadow: state.isFocused ? "0 0 0 1px #931B82" : "none",
    "&:hover": { borderColor: state.isFocused ? "#931B82" : "#A8A8A8" },
    fontSize: "14px",
  }),
  dropdownIndicator: (base) => ({ ...base, paddingRight: "12px" }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({ ...base, zIndex: 60 }),
  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    backgroundColor: state.isSelected
      ? "#931B82"
      : state.isFocused
        ? "#F3E8F7"
        : "white",
    color: state.isSelected ? "white" : "#212121",
    cursor: "pointer",
  }),
  placeholder: (base) => ({ ...base, color: "#A8A8A8", fontSize: "14px" }),
  singleValue: (base) => ({ ...base, color: "#212121", fontSize: "14px" }),
};

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUserMut = useCreateUser();

  const isValid =
    loginId.trim() !== "" &&
    password.trim() !== "" &&
    name.trim() !== "" &&
    role !== "";

  const reset = () => {
    setLoginId("");
    setPassword("");
    setName("");
    setRole("");
    setShowPassword(false);
    setError(null);
  };

  const handleClose = () => {
    if (createUserMut.isPending) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || createUserMut.isPending) return;
    setError(null);
    try {
      await createUserMut.mutateAsync({
        loginId: loginId.trim(),
        password: password.trim(),
        name: name.trim(),
        role: role as Role,
      });
      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as { message?: string } | undefined;
        setError(data?.message ?? "사용자 추가에 실패했습니다.");
      } else {
        setError("사용자 추가에 실패했습니다.");
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#212121]">사용자 추가</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={createUserMut.isPending}
            aria-label="닫기"
            className="text-[#6B7280] transition-colors hover:text-[#212121] disabled:opacity-50"
          >
            <Icon icon="mdi:close" width={20} height={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="아이디">
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="예: quality01"
              autoComplete="off"
              className="h-11 w-full rounded-md border border-[#A8A8A8] bg-white px-3 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
          </Field>

          <Field label="비밀번호">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoComplete="new-password"
                className="h-11 w-full rounded-md border border-[#A8A8A8] bg-white px-3 pr-10 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A8A8A8] hover:text-[#931B82]"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보이기"}
              >
                <Icon
                  icon={showPassword ? "mdi:eye-outline" : "mdi:eye-off-outline"}
                  width={20}
                />
              </button>
            </div>
          </Field>

          <Field label="이름">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="h-11 w-full rounded-md border border-[#A8A8A8] bg-white px-3 text-sm text-[#212121] placeholder:text-[#A8A8A8] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
          </Field>

          <Field label="역할">
            <Select<RoleOption, false>
              options={ROLE_OPTIONS}
              value={ROLE_OPTIONS.find((o) => o.value === role) ?? null}
              onChange={(opt) => setRole(opt?.value ?? "")}
              placeholder="역할을 선택해주세요"
              isSearchable={false}
              styles={selectStyles}
            />
          </Field>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={createUserMut.isPending}
            className="h-10 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!isValid || createUserMut.isPending}
            className="h-10 rounded-md bg-[#931B82] px-4 text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]"
          >
            {createUserMut.isPending ? "추가 중..." : "추가"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#6B7280]">{label}</span>
      {children}
    </label>
  );
}
