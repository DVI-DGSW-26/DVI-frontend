import { useEffect, useState } from "react";
import { judgeMeasurement } from "../lib/judgment";
import JudgmentBadge from "./JudgmentBadge";
import type { InspectionProcess, PassFailResult } from "../type/types";
import { toBackendImageUrl } from "../../../lib/imageUrl";

interface Props {
  /** 사진 없이 측정값만 입력하는 경우 null — 그땐 미리보기/다시 촬영 동작이 달라짐. */
  blob: Blob | null;
  /** "이전 단계" 로 돌아왔을 때 기존 사진을 보여주기 위한 백엔드 URL. blob 없을 때만 사용. */
  existingImageUrl?: string;
  /** "이전 단계" 로 돌아왔을 때 기존 측정값. 입력 초기값으로 채움. */
  initialValue?: string;
  isLastDim: boolean;
  isSaving: boolean;
  isPreparing: boolean;
  suggestedValue: string | null;
  /** 기준값/공차 — 입력값이 합격 범위 안인지 실시간 표시 용도. */
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  /** 공정 — MACHINING 일 때 OK/NG 드롭다운 노출. */
  process: InspectionProcess;
  /** 가공 공정에서 기존 판정값 복원용. 사용자가 수정 안 하면 그대로 제출. */
  initialPassFailValue?: PassFailResult;
  onRetake: () => void;
  /** 입력 단계에서도 이전 dim 으로 돌아갈 수 있게. 부모가 stepIndex > 0 일 때만 전달. */
  onGoBack?: () => void;
  /** 입력 단계에서 저장 없이 다음 dim 으로 이동. 부모가 stepIndex < last 일 때만 전달. */
  onGoNext?: () => void;
  /** 가공 공정이면 두 번째 인자에 OK/NG 도 전달. 다른 공정은 undefined. */
  onSubmit: (measuredValue: number, passFailResult?: PassFailResult) => void;
}

export default function InputPhase({
  blob,
  existingImageUrl,
  initialValue,
  isLastDim,
  isSaving,
  isPreparing,
  suggestedValue,
  standardValue,
  tolerancePlus,
  toleranceMinus,
  process,
  initialPassFailValue,
  onRetake,
  onGoBack,
  onGoNext,
  onSubmit,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string>("");
  useEffect(() => {
    // 1) 새로 크롭한 blob 이 있으면 그걸 미리보기.
    if (blob) {
      const url = URL.createObjectURL(blob);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- createObjectURL/revokeObjectURL pair must be lifecycle-bound
      setImageSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    // 2) blob 없고 기존 사진 URL 이 있으면 그걸로 미리보기 (이전 단계 복원).
    if (existingImageUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 URL 은 정리할 자원 없어 단순 set
      setImageSrc(toBackendImageUrl(existingImageUrl) ?? "");
      return;
    }
    // 3) 둘 다 없으면 "사진 없이 측정값만" 안내.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 위 케이스 모두 미해당 시 미리보기 비움
    setImageSrc("");
  }, [blob, existingImageUrl]);

  const [value, setValue] = useState(() => initialValue ?? "");
  const [autoFilled, setAutoFilled] = useState(() => !!initialValue);
  // 가공 공정에서 작업자가 직접 OK/NG 를 선택했는지. true 가 된 뒤로는 자동 판정으로 덮어쓰지 않는다.
  const [passFailTouched, setPassFailTouched] = useState(
    () => !!initialPassFailValue,
  );
  const [passFailValue, setPassFailValue] = useState<PassFailResult | null>(
    () => initialPassFailValue ?? null,
  );

  const isMachining = process === "MACHINING";

  // preparing 이 끝나는 시점에 OCR 결과를 한 번만 인풋에 반영한다.
  // 사용자가 이후에 수정하면 그 값을 유지.
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

  // 실시간 합격/불합격 — 입력값이 비어있거나 유효하지 않으면 null (뱃지 숨김).
  const judgment = isValid
    ? judgeMeasurement(numeric, standardValue, tolerancePlus, toleranceMinus)
    : null;

  // 가공 공정에서 측정값이 유효하면 자동으로 판정값 시드. 사용자가 한 번이라도 직접 바꿨다면 안 건드린다.
  useEffect(() => {
    if (!isMachining || passFailTouched || !isValid || !judgment) return;
    const auto: PassFailResult = judgment === "pass" ? "OK" : "NG";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 자동 시드는 derived state 가 아니라 사용자가 수정 전까지의 기본값 1회 설정
    setPassFailValue(auto);
  }, [isMachining, passFailTouched, isValid, judgment]);

  const inputDisabled = isSaving || isPreparing;
  // 가공 공정은 측정값 + OK/NG 둘 다 필요. 다른 공정은 측정값만.
  const submitDisabled =
    !isValid ||
    isSaving ||
    isPreparing ||
    (isMachining && passFailValue == null);

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

  const handlePassFailChange = (v: PassFailResult) => {
    setPassFailTouched(true);
    setPassFailValue(v);
  };

  const handleSubmit = () => {
    if (isMachining) {
      if (passFailValue == null) return;
      onSubmit(numeric, passFailValue);
    } else {
      onSubmit(numeric);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {imageSrc ? (
        <div className="flex items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-[#F9FAFB]">
          <img
            src={imageSrc}
            alt="크롭된 측정 부위"
            className="block max-h-40 w-auto object-contain"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-[#F9FAFB] px-4 py-6 text-center text-xs text-[#6B7280]">
          사진 없이 측정값만 입력합니다.
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
        {hint && <p className={`mt-2 text-xs ${hintColor}`}>{hint.text}</p>}

        {isMachining && (
          <div className="mt-3">
            <label
              htmlFor="passfail-select"
              className="block text-xs font-medium text-[#6B7280]"
            >
              판정 (가공)
            </label>
            <select
              id="passfail-select"
              value={passFailValue ?? ""}
              onChange={(e) =>
                handlePassFailChange(e.target.value as PassFailResult)
              }
              disabled={inputDisabled}
              className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
            >
              <option value="" disabled>
                판정을 선택해주세요
              </option>
              <option value="OK">OK (합격)</option>
              <option value="NG">NG (불합격)</option>
            </select>
            <p className="mt-1 text-[11px] text-[#9CA3AF]">
              측정값이 기준 범위 안이면 자동으로 OK, 벗어나면 NG 로 설정됩니다. 필요하면 직접 변경하세요.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            disabled={isSaving || isPreparing}
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-[#6B7280] disabled:opacity-60"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={onRetake}
          disabled={isSaving || isPreparing}
          className="h-11 flex-1 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#212121] disabled:opacity-60"
        >
          {blob ? "다시 촬영" : "사진 촬영하기"}
        </button>
        {onGoNext && (
          <button
            type="button"
            onClick={onGoNext}
            disabled={isSaving || isPreparing}
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-[#6B7280] disabled:opacity-60"
          >
            다음
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
