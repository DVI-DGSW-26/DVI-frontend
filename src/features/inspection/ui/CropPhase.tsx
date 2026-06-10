import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { getCroppedBlob } from "../lib/cropImage";

interface Props {
  file: File;
  onRetake: () => void;
  onConfirm: (blob: Blob) => void;
  onError: (message: string) => void;
}

export default function CropPhase({
  file,
  onRetake,
  onConfirm,
  onError,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [confirming, setConfirming] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- createObjectURL/revokeObjectURL pair must be lifecycle-bound
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height) * 0.8;
    const initial: PixelCrop = {
      unit: "px",
      x: (width - size) / 2,
      y: (height - size) / 2,
      width: size,
      height: size,
    };
    setCrop(initial);
    setCompletedCrop(initial);
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!completedCrop || !img || !imageSrc) return;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const area = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
    };

    setConfirming(true);
    try {
      const blob = await getCroppedBlob(imageSrc, area);
      // TEMP DEBUG: 첫 업로드 실패 원인 추적 — blob 유효성 확인용.
      console.log("🟠 CropPhase onConfirm 직전 blob:", blob);
      console.log("🟠 blob.size:", blob.size, "blob.type:", blob.type);
      onConfirm(blob);
    } catch (err) {
      console.error("🟠 CropPhase getCroppedBlob 에러:", err);
      onError(err instanceof Error ? err.message : "크롭에 실패했습니다.");
      setConfirming(false);
    }
  };

  const canConfirm =
    !!completedCrop && completedCrop.width > 0 && completedCrop.height > 0;

  return (
    // 모바일에서 ReactCrop 이 이미지 위 터치를 다 캡쳐해 페이지 스크롤이 막힌다.
    // 안내문 + 액션 버튼을 화면 하단에 sticky 로 고정해 스크롤 없이도 접근 가능.
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex w-full justify-center overflow-hidden rounded-xl">
        {imageSrc && (
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            keepSelection
            minWidth={40}
            minHeight={40}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="크롭 대상"
              onLoad={handleImageLoad}
              className="block max-h-[70vh] w-auto select-none"
              draggable={false}
            />
          </ReactCrop>
        )}
      </div>

      <div className="sticky bottom-16 z-20 -mx-4 flex flex-col gap-2 border-t border-gray-200 bg-[#F5F5F5] px-4 pb-3 pt-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <p className="text-xs text-[#6B7280]">
          모서리·변 핸들을 드래그해서 측정 부위만 선택해주세요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRetake}
            disabled={confirming}
            className="h-11 flex-1 rounded-md border border-gray-300 bg-white text-sm font-semibold text-[#212121] disabled:opacity-60"
          >
            다시 촬영
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || !canConfirm}
            className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
          >
            {confirming ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
