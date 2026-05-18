import { useRef } from "react";
import { Icon } from "@iconify/react";
import { isAllowedImageFile, MAX_UPLOAD_BYTES } from "../lib/cropImage";

interface Props {
  onCaptured: (file: File) => void;
  onError: (message: string) => void;
  onSkip: () => void;
}

export default function CapturePhase({ onCaptured, onError, onSkip }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      console.warn("[capture] no file from input");
      return;
    }
    console.info(
      "[capture] file:",
      file.name,
      "type:",
      file.type,
      "size:",
      file.size,
    );

    if (!isAllowedImageFile(file)) {
      console.warn("[capture] rejected — disallowed type:", file.type);
      onError(`PNG/JPG 이미지만 업로드할 수 있습니다. (현재: ${file.type || "unknown"})`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      console.warn("[capture] rejected — too large:", file.size);
      onError("최대 10MB 이하의 이미지만 업로드할 수 있습니다.");
      return;
    }
    onCaptured(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#D1D5DB] bg-white px-6 py-10">
        <Icon
          icon="solar:camera-bold"
          width={56}
          height={56}
          className="text-[#931B82]"
        />
        <div className="text-center">
          <div className="text-sm font-medium text-[#212121]">
            측정 부위를 촬영해주세요
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">
            PNG/JPG · 최대 10MB
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-11 rounded-md bg-[#931B82] px-6 text-sm font-semibold text-white hover:bg-[#6A0F5D]"
        >
          사진 촬영
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          capture="environment"
          onChange={handleChange}
          className="hidden"
        />
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="h-11 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
      >
        사진 촬영 불가
      </button>
    </div>
  );
}
