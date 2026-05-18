import { useEffect, useState } from "react";

interface Props {
  blob: Blob;
  isLastDim: boolean;
  isSaving: boolean;
  onRetake: () => void;
  onSubmit: (measuredValue: number) => void;
}

export default function InputPhase({
  blob,
  isLastDim,
  isSaving,
  onRetake,
  onSubmit,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string>("");
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- createObjectURL/revokeObjectURL pair must be lifecycle-bound
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const [value, setValue] = useState("");
  const numeric = Number(value);
  const isValid = value.trim() !== "" && Number.isFinite(numeric);

  const buttonLabel = isSaving
    ? "저장 중..."
    : isLastDim
      ? "완료"
      : "저장 후 다음";

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#F9FAFB]">
        {imageSrc && (
          <img
            src={imageSrc}
            alt="크롭된 측정 부위"
            className="block aspect-square w-full object-contain"
          />
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-xs font-medium text-[#6B7280]">
          측정값
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="예: 100.25"
          disabled={isSaving}
          className="mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-base text-[#212121] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82] disabled:bg-[#F3F4F6]"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetake}
          disabled={isSaving}
          className="h-11 flex-1 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#212121] disabled:opacity-60"
        >
          다시 촬영
        </button>
        <button
          type="button"
          onClick={() => onSubmit(numeric)}
          disabled={!isValid || isSaving}
          className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
