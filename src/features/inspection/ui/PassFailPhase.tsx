import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PassFailResult } from "../type/types";

interface Props {
  /** "이전 단계" 로 돌아왔을 때 기존 선택값 복원용. */
  initialValue?: PassFailResult;
  isLastDim: boolean;
  isSaving: boolean;
  /** 이전 dim 으로 이동. 부모가 stepIndex > 0 일 때만 전달. */
  onGoBack?: () => void;
  /** 저장 없이 다음 dim 으로 이동. 부모가 stepIndex < last 일 때만 전달. */
  onGoNext?: () => void;
  onSubmit: (passFailResult: PassFailResult) => void;
}

// OK/NG(PASS_FAIL) 항목 전용 입력 단계 — 사진·측정값 없이 OK/NG 만 선택한다.
export default function PassFailPhase({
  initialValue,
  isLastDim,
  isSaving,
  onGoBack,
  onGoNext,
  onSubmit,
}: Props) {
  const { t } = useTranslation("inspection");
  const [value, setValue] = useState<PassFailResult | null>(
    () => initialValue ?? null,
  );

  const submitDisabled = value == null || isSaving;
  const buttonLabel = isSaving
    ? t("input.saving")
    : isLastDim
      ? t("input.done")
      : t("input.saveAndNext");

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-edge bg-surface p-4">
        <span className="block text-xs font-medium text-fg-muted">
          {t("judgment.label")}
        </span>
        <div
          role="radiogroup"
          aria-label={t("passFail.ariaLabel")}
          className="mt-2 grid grid-cols-2 gap-2"
        >
          {(["OK", "NG"] as const).map((opt) => {
            const selected = value === opt;
            const isOk = opt === "OK";
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setValue(opt)}
                disabled={isSaving}
                className={`h-14 rounded-md border text-base font-semibold transition-colors disabled:opacity-60 ${
                  selected
                    ? isOk
                      ? "border-success bg-success-soft text-success-fg"
                      : "border-danger bg-danger-soft text-danger-fg"
                    : "border-line-strong bg-surface text-fg-muted hover:bg-surface-2"
                }`}
              >
                {isOk ? t("judgment.okPass") : t("judgment.ngFail")}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[0.6875rem] text-fg-subtle">
          {t("passFail.notice")}
        </p>
      </div>

      <div className="flex gap-2">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            disabled={isSaving}
            className="h-11 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-fg-muted disabled:opacity-60"
          >
            {t("input.prev")}
          </button>
        )}
        {onGoNext && (
          <button
            type="button"
            onClick={onGoNext}
            disabled={isSaving}
            className="h-11 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-fg-muted disabled:opacity-60"
          >
            {t("input.next")}
          </button>
        )}
        <button
          type="button"
          onClick={() => value != null && onSubmit(value)}
          disabled={submitDisabled}
          className="h-11 flex-1 rounded-md bg-brand text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:bg-surface-3"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
