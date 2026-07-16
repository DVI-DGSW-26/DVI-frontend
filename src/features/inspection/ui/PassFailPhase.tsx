import { useState } from "react";
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
  const [value, setValue] = useState<PassFailResult | null>(
    () => initialValue ?? null,
  );

  const submitDisabled = value == null || isSaving;
  const buttonLabel = isSaving ? "저장 중..." : isLastDim ? "완료" : "저장 후 다음";

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <span className="block text-xs font-medium text-[#6B7280]">판정</span>
        <div
          role="radiogroup"
          aria-label="OK/NG 판정"
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
                      ? "border-[#22C55E] bg-[#ECFDF5] text-[#15803D]"
                      : "border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]"
                    : "border-gray-300 bg-white text-[#6B7280] hover:bg-gray-50"
                }`}
              >
                {isOk ? "OK (합격)" : "NG (불합격)"}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[#9CA3AF]">
          이 항목은 사진·측정값 없이 OK/NG 만 선택합니다.
        </p>
      </div>

      <div className="flex gap-2">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            disabled={isSaving}
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-[#6B7280] disabled:opacity-60"
          >
            이전
          </button>
        )}
        {onGoNext && (
          <button
            type="button"
            onClick={onGoNext}
            disabled={isSaving}
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-[#6B7280] disabled:opacity-60"
          >
            다음
          </button>
        )}
        <button
          type="button"
          onClick={() => value != null && onSubmit(value)}
          disabled={submitDisabled}
          className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
