import { useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import Select, { type StylesConfig } from "react-select";
import { useTranslation } from "react-i18next";
import { useCreateUser } from "../api";
import type { Role } from "../../auth/type/types";
import { selectTheme } from "../../../lib/selectTheme";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface RoleOption {
  value: Role;
  label: string;
}

// 설비 관리자는 회원가입으로 만들 수 없어 여기서만 만든다.
const ROLE_VALUES: Role[] = ["PRODUCTION", "QUALITY", "QUALITY_ADMIN", "EQUIPMENT_MANAGER", "ADMIN"];

const selectStyles: StylesConfig<RoleOption, false> = {
  control: (base, state) => ({
    ...base,
    height: "44px",
    minHeight: "44px",
    borderColor: state.isFocused ? "var(--color-brand)" : "var(--color-line-strong)",
    borderRadius: "6px",
    boxShadow: state.isFocused ? "0 0 0 1px var(--color-brand)" : "none",
    "&:hover": { borderColor: state.isFocused ? "var(--color-brand)" : "var(--color-line-strong)" },
    fontSize: "14px",
  }),
  dropdownIndicator: (base) => ({ ...base, paddingRight: "12px" }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({ ...base, zIndex: 60 }),
  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    backgroundColor: state.isSelected
      ? "var(--color-brand)"
      : state.isFocused
        ? "var(--color-brand-soft)"
        : "var(--color-surface)",
    color: state.isSelected ? "var(--color-on-brand)" : "var(--color-fg)",
    cursor: "pointer",
  }),
  placeholder: (base) => ({ ...base, color: "var(--color-fg-subtle)", fontSize: "14px" }),
  singleValue: (base) => ({ ...base, color: "var(--color-fg)", fontSize: "14px" }),
};

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation("userSearch");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUserMut = useCreateUser();

  const roleOptions: RoleOption[] = ROLE_VALUES.map((value) => ({
    value,
    label: t(`roles.${value}`, { ns: "common" }),
  }));

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
        setError(data?.message ?? t("createModal.createFailed"));
      } else {
        setError(t("createModal.createFailed"));
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl border border-edge"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">
            {t("createModal.title")}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={createUserMut.isPending}
            aria-label={t("actions.close", { ns: "common" })}
            className="text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
          >
            <Icon icon="mdi:close" width={20} height={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Field label={t("createModal.loginId")}>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder={t("createModal.loginIdPlaceholder")}
              autoComplete="off"
              className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </Field>

          <Field label={t("createModal.password")}>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("createModal.passwordPlaceholder")}
                autoComplete="new-password"
                className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 pr-10 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-brand-fg"
                aria-label={
                  showPassword
                    ? t("createModal.hidePassword")
                    : t("createModal.showPassword")
                }
              >
                <Icon
                  icon={showPassword ? "mdi:eye-outline" : "mdi:eye-off-outline"}
                  width={20}
                />
              </button>
            </div>
          </Field>

          <Field label={t("createModal.name")}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createModal.namePlaceholder")}
              className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </Field>

          <Field label={t("createModal.role")}>
            <Select<RoleOption, false>
              theme={selectTheme}
              options={roleOptions}
              value={roleOptions.find((o) => o.value === role) ?? null}
              onChange={(opt) => setRole(opt?.value ?? "")}
              placeholder={t("createModal.rolePlaceholder")}
              isSearchable={false}
              styles={selectStyles}
            />
          </Field>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger-fg">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={createUserMut.isPending}
            className="h-10 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {t("actions.cancel", { ns: "common" })}
          </button>
          <button
            type="submit"
            disabled={!isValid || createUserMut.isPending}
            className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-surface-3"
          >
            {createUserMut.isPending
              ? t("createModal.submitting")
              : t("createModal.submit")}
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
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
