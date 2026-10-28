import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { judgeMeasurement } from "../../inspection/lib/judgment";
import JudgmentBadge from "../../inspection/ui/JudgmentBadge";
import { toBackendImageUrl } from "../../../lib/imageUrl";

interface Props {
  /** 사진 없이 측정값만 입력하는 경우 null. 그땐 미리보기/다시촬영을 숨긴다. */
  blob: Blob | null;
  /** "이전 단계" 복원 시 기존 사진 URL — blob 없을 때 미리보기로 사용. */
  existingImageUrl?: string;
  /** "이전 단계" 복원 시 기존 측정값 — 입력 초기값. */
  initialValue?: string;
  isLastDim: boolean;
  isSaving: boolean;
  isPreparing: boolean;
  suggestedValue: string | null;
  /** 기준값/공차 — 자주검사처럼 입력 값이 합격 범위 안인지 실시간 판정 표시 용도. */
  standardValue: number;
  toleranceUpper: number;
  toleranceLower: number;
  onRetake: () => void;
  /** 입력 단계에서도 이전 dim 으로 이동 가능하게. 부모가 stepIndex > 0 일 때만 전달. */
  onGoBack?: () => void;
  /** 저장 없이 다음 dim 으로 이동. 부모가 stepIndex < last 일 때만 전달. */
  onGoNext?: () => void;
  onSubmit: (measuredValue: number) => void;
}

export default function CrossCheckInputPhase({
  blob,
  existingImageUrl,
  initialValue,
  isLastDim,
  isSaving,
  isPreparing,
  suggestedValue,
  standardValue,
  toleranceUpper,
  toleranceLower,
  onRetake,
  onGoBack,
  onGoNext,
  onSubmit,
}: Props) {
  const { t } = useTranslation("crossCheck");
  const [imageSrc, setImageSrc] = useState<string>("");
  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- createObjectURL/revokeObjectURL pair must be lifecycle-bound
      setImageSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    if (existingImageUrl) {
      // 외부 URL 은 정리할 자원 없음
      setImageSrc(toBackendImageUrl(existingImageUrl) ?? "");
      return;
    }
    // 둘 다 없으면 미리보기 비움
    setImageSrc("");
  }, [blob, existingImageUrl]);

  const [value, setValue] = useState(() => initialValue ?? "");
  const [autoFilled, setAutoFilled] = useState(() => !!initialValue);

  // 자주검사와 동일 — preparing 종료 시점에 OCR 결과를 1회만 인풋에 반영. 이후 사용자 수정 유지.
  useEffect(() => {
    if (isPreparing || autoFilled) return;
    if (suggestedValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async OCR suggestion 이 부모에서 비동기로 도착한 후 1회만 controlled input 을 시드한다 (cascading render 아님)
      setValue(suggestedValue);
    }
    setAutoFilled(true);
  }, [isPreparing, autoFilled, suggestedValue]);

  const numeric = Number(value);
  const isValid = value.trim() !== "" && Number.isFinite(numeric);

  // 실시간 합격/불합격 — 입력 값이 비어있거나 유효하지 않으면 null (뱃지 숨김).
  const judgment = isValid
    ? judgeMeasurement(numeric, standardValue, toleranceUpper, toleranceLower)
    : null;

  const inputDisabled = isSaving || isPreparing;
  const submitDisabled = !isValid || isSaving || isPreparing;

  const buttonLabel = isPreparing
    ? t("input.ocrRunning")
    : isSaving
      ? t("input.saving")
      : isLastDim
        ? t("input.done")
        : t("input.saveAndNext");

  const hint = isPreparing
    ? { text: t("input.hintOcrRunning"), tone: "info" as const }
    : autoFilled && suggestedValue
      ? {
          text: t("input.hintOcrFilled"),
          tone: "ok" as const,
        }
      : autoFilled
        ? {
            text: t("input.hintOcrFailed"),
            tone: "warn" as const,
          }
        : null;

  const hintColor =
    hint?.tone === "ok"
      ? "text-brand-fg"
      : hint?.tone === "warn"
        ? "text-warn-fg"
        : "text-fg-muted";

  return (
    <div className="flex flex-col gap-3">
      {imageSrc && (
        <div className="flex items-center justify-center overflow-hidden rounded-xl border border-line bg-canvas">
          <img
            src={imageSrc}
            alt={t("input.croppedAlt")}
            className="block max-h-40 w-auto object-contain"
          />
        </div>
      )}

      <div className="rounded-xl border border-edge bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-fg-muted">
            {t("input.measuredValue")}
          </label>
          <JudgmentBadge judgment={judgment} compact />
        </div>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isPreparing ? t("input.ocrRunning") : ""}
          disabled={inputDisabled}
          className="mt-1 h-11 w-full rounded-md border border-line-strong px-3 text-base text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-2"
        />
        {hint && <p className={`mt-2 text-xs ${hintColor}`}>{hint.text}</p>}
      </div>

      <div className="flex gap-2">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            disabled={isSaving || isPreparing}
            className="h-11 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-fg-muted disabled:opacity-60"
          >
            {t("input.prev")}
          </button>
        )}
        <button
          type="button"
          onClick={onRetake}
          disabled={isSaving || isPreparing}
          className="h-11 flex-1 rounded-md border border-line-strong bg-surface text-sm font-semibold text-fg disabled:opacity-60"
        >
          {blob ? t("input.retake") : t("input.takePhoto")}
        </button>
        {onGoNext && (
          <button
            type="button"
            onClick={onGoNext}
            disabled={isSaving || isPreparing}
            className="h-11 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-fg-muted disabled:opacity-60"
          >
            {t("input.next")}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSubmit(numeric)}
          disabled={submitDisabled}
          className="h-11 flex-1 rounded-md bg-brand text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:bg-surface-3"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
