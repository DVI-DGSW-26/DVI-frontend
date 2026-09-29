import { useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useCreateProcess, useUpdateProcess } from "../api";
import type { ProcessInfo } from "../api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 있으면 수정, 없으면 등록. */
  process?: ProcessInfo | null;
}

// 폼 체크박스로 다루는 공정 설정. 값 하나하나가 화면 동작을 가르므로 무엇이 달라지는지
// hint(process:form.flagOptions.*)로 함께 보여준다 — 체크박스 이름만 보고는 판단할 수 없다.
const FLAG_KEYS = [
  "hardnessTracked",
  "bundledReport",
  "autoCopyNightCrossCheck",
] as const;

// 약칭은 설비코드·보고서번호(DV-EX-IR-...)에 들어가는 값이라 형식을 지킨다.
const SHORT_CODE_PATTERN = /^[A-Z0-9]{2,4}$/;
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export default function ProcessFormDrawer({ open, onClose, process }: Props) {
  const { t } = useTranslation(["process", "common"]);
  const isEdit = !!process;

  const [code, setCode] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [label, setLabel] = useState("");
  const [flags, setFlags] = useState({
    hardnessTracked: false,
    bundledReport: false,
    autoCopyNightCrossCheck: false,
  });
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { mutate: create, isPending: isCreating } = useCreateProcess();
  const { mutate: update, isPending: isUpdating } = useUpdateProcess();
  const isPending = isCreating || isUpdating;

  // 드로어가 열릴 때(등록/수정 대상이 바뀔 때) 폼을 초기화한다.
  // effect 가 아니라 "렌더 중 state 조정" 패턴 — 열자마자 빈 폼을 한 번 그린 뒤
  // 다시 그리는 연쇄 렌더가 없다. 닫힌 동안(sessionKey=null)엔 건드리지 않는다.
  const sessionKey = open ? (process ? `edit:${process.code}` : "create") : null;
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (sessionKey !== prevSessionKey) {
    setPrevSessionKey(sessionKey);
    if (sessionKey !== null) {
      setCode(process?.code ?? "");
      setShortCode(process?.shortCode ?? "");
      setLabel(process?.label ?? "");
      setFlags({
        hardnessTracked: process?.hardnessTracked ?? false,
        bundledReport: process?.bundledReport ?? false,
        autoCopyNightCrossCheck: process?.autoCopyNightCrossCheck ?? false,
      });
      setIsActive(process?.isActive ?? true);
      setError(null);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (!trimmedLabel) return setError(t("form.labelRequired"));

    const handlers = {
      onSuccess: () => onClose(),
      onError: (err: unknown) => {
        // 코드 중복 등 백엔드가 준 사유를 그대로 보여준다.
        const message =
          err instanceof AxiosError
            ? (err.response?.data as { message?: string } | undefined)?.message
            : undefined;
        setError(
          message ?? (isEdit ? t("form.updateError") : t("form.createError")),
        );
      },
    };

    if (isEdit && process) {
      // 코드·약칭은 서버가 수정을 막는다 — 나머지만 보낸다.
      update(
        {
          code: process.code,
          body: { label: trimmedLabel, ...flags, isActive },
        },
        handlers,
      );
      return;
    }

    const upperCode = code.trim().toUpperCase();
    const upperShort = shortCode.trim().toUpperCase();
    if (!CODE_PATTERN.test(upperCode)) return setError(t("form.codeInvalid"));
    if (!SHORT_CODE_PATTERN.test(upperShort))
      return setError(t("form.shortCodeInvalid"));

    create(
      { code: upperCode, shortCode: upperShort, label: trimmedLabel, ...flags },
      handlers,
    );
  };

  const title = isEdit ? t("form.editTitle") : t("form.createTitle");
  const submitLabel = isEdit
    ? isPending
      ? t("form.submittingUpdate")
      : t("form.submitUpdate")
    : isPending
      ? t("form.submittingCreate")
      : t("form.submitCreate");

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#212121]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common:actions.close")}
            className="text-[#A8A8A8] transition-colors hover:text-[#212121]"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#212121]">
                {t("form.code")}
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="INJECTION_MOLDING"
                disabled={isEdit}
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50 disabled:text-[#6B7280]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#212121]">
                {t("form.shortCode")}
              </span>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                placeholder="IJ"
                maxLength={4}
                disabled={isEdit}
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50 disabled:text-[#6B7280]"
              />
            </label>
          </div>
          <p className="-mt-3 text-xs text-[#6B7280]">
            {isEdit ? t("form.codeNoteEdit") : t("form.codeNoteCreate")}
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">
              {t("form.label")}
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("form.labelPlaceholder")}
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#212121]">
              {t("form.settings")}
            </span>
            {FLAG_KEYS.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={flags[key]}
                  onChange={(e) =>
                    setFlags((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#931B82]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#212121]">
                    {t(`form.flagOptions.${key}.label`)}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#6B7280]">
                    {t(`form.flagOptions.${key}.hint`)}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {isEdit && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#931B82]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[#212121]">
                  {t("form.active")}
                </span>
                <span className="mt-0.5 block text-xs text-[#6B7280]">
                  {t("form.activeHint")}
                </span>
              </span>
            </label>
          )}

          {error && (
            <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          <div className="mt-auto flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
            >
              {t("common:actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 flex-1 rounded-lg bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
