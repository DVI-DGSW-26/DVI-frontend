import { useEffect, useState } from "react";
import { judgeMeasurement } from "../../inspection/lib/judgment";
import JudgmentBadge from "../../inspection/ui/JudgmentBadge";

interface Props {
  /** 사진 없이 측정값만 입력하는 경우 null. 그땐 미리보기/다시촬영을 숨긴다. */
  blob: Blob | null;
  isLastDim: boolean;
  isSaving: boolean;
  isPreparing: boolean;
  suggestedValue: string | null;
  /** 기준값/공차 — 자주검사처럼 입력 값이 합격 범위 안인지 실시간 판정 표시 용도. */
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  onRetake: () => void;
  onSubmit: (measuredValue: number) => void;
}

export default function CrossCheckInputPhase({
  blob,
  isLastDim,
  isSaving,
  isPreparing,
  suggestedValue,
  standardValue,
  tolerancePlus,
  toleranceMinus,
  onRetake,
  onSubmit,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string>("");
  useEffect(() => {
    // 사진 없이 입력하는 경우 blob 이 없으므로 미리보기 URL 을 만들지 않는다.
    // (imageSrc 는 stale 하게 남아도 렌더에서 blob 가드로 표시 안 됨)
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- createObjectURL/revokeObjectURL pair must be lifecycle-bound
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const [value, setValue] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);

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
    ? judgeMeasurement(numeric, standardValue, tolerancePlus, toleranceMinus)
    : null;

  const inputDisabled = isSaving || isPreparing;
  const submitDisabled = !isValid || isSaving || isPreparing;

  const buttonLabel = isPreparing
    ? "OCR 인식 중..."
    : isSaving
      ? "저장 중..."
      : isLastDim
        ? "완료"
        : "저장 후 다음";

  const hint = isPreparing
    ? { text: "OCR로 측정값을 인식하는 중입니다…", tone: "info" as const }
    : autoFilled && suggestedValue
      ? {
          text: "OCR로 자동 입력됨 — 필요하면 수정해주세요.",
          tone: "ok" as const,
        }
      : autoFilled
        ? {
            text: "자동 인식 실패, 직접 입력해주세요.",
            tone: "warn" as const,
          }
        : null;

  const hintColor =
    hint?.tone === "ok"
      ? "text-[#931B82]"
      : hint?.tone === "warn"
        ? "text-[#B45309]"
        : "text-[#6B7280]";

  return (
    <div className="flex flex-col gap-3">
      {blob && imageSrc && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#F9FAFB]">
          <img
            src={imageSrc}
            alt="크롭된 측정 부위"
            className="block aspect-square w-full object-contain"
          />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-[#6B7280]">
            측정값
          </label>
          <JudgmentBadge judgment={judgment} compact />
        </div>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isPreparing ? "OCR 인식 중..." : "예: 100.25"}
          disabled={inputDisabled}
          className="mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-base text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
        />
        {hint && (
          <p className={`mt-2 text-xs ${hintColor}`}>{hint.text}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetake}
          disabled={isSaving || isPreparing}
          className="h-11 flex-1 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#212121] disabled:opacity-60"
        >
          {blob ? "다시 촬영" : "사진 촬영"}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(numeric)}
          disabled={submitDisabled}
          className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
