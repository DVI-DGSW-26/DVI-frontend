import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { isAllowedImageFile, MAX_UPLOAD_BYTES } from "../lib/cropImage";
import CaptureGuideModal from "./CaptureGuideModal";

// 촬영 가이드 예시 화면을 세션당 1회만 자동 노출하기 위한 키.
const GUIDE_SEEN_KEY = "ocr-capture-guide-seen";

// OCR 인식이 가능한 최소 해상도(가로/세로). 이보다 작으면 재촬영 안내.
const MIN_OCR_DIMENSION = 600;

function readImageSize(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };
    img.src = url;
  });
}

interface Props {
  onCaptured: (file: File) => void;
  onError: (message: string) => void;
  onSkip: () => void;
  /** 첫 dim 이 아니면 직전 dim 으로 돌아가 재촬영. 부모가 stepIndex > 0 일 때만 전달. */
  onGoBack?: () => void;
  /** 마지막 dim 이 아니면 다음 dim 으로 자유 이동. 부모가 stepIndex < last 일 때만 전달. */
  onGoNext?: () => void;
  /** 사진 없이 측정값만 입력. 전달된 경우에만 버튼 노출 (순회검사 한정). */
  onMeasureWithoutPhoto?: () => void;
}

export default function CapturePhase({
  onCaptured,
  onError,
  onSkip,
  onGoBack,
  onGoNext,
  onMeasureWithoutPhoto,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!isCameraOpen) return;
    let cancelled = false;

    const acquireRearStream = async (): Promise<MediaStream> => {
      // 1) exact 후면 카메라 강제
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // 2) 폴백: probe 로 권한 확보 → 라벨로 후면 deviceId 식별
      }

      const probe = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");
        const rear = cameras.find((d) =>
          /back|rear|environment|후면|뒷/i.test(d.label),
        );
        if (rear) {
          probe.getTracks().forEach((t) => t.stop());
          return await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: rear.deviceId } },
            audio: false,
          });
        }
        return probe;
      } catch (err) {
        probe.getTracks().forEach((t) => t.stop());
        throw err;
      }
    };

    setIsStarting(true);
    acquireRearStream()
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIsCameraOpen(false);
          const name = (err as DOMException)?.name;
          if (name === "NotAllowedError" || name === "SecurityError") {
            onError("카메라 권한이 필요합니다. 브라우저 권한을 허용해주세요.");
          } else if (name === "NotFoundError") {
            fileInputRef.current?.click();
          } else {
            onError("카메라를 열 수 없습니다.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsStarting(false);
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraOpen, onError]);

  const handleOpenCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }
    setIsCameraOpen(true);
  };

  // 사진 촬영 버튼 — 세션 첫 촬영이면 가이드 예시를 먼저 보여주고, 이후엔 바로 카메라.
  const handleCaptureClick = () => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(GUIDE_SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    if (!seen) {
      setShowGuide(true);
      return;
    }
    handleOpenCamera();
  };

  const handleGuideStart = () => {
    try {
      sessionStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      // sessionStorage 사용 불가 환경 — 무시하고 진행.
    }
    setShowGuide(false);
    handleOpenCamera();
  };

  const handleCloseCamera = () => {
    setIsCameraOpen(false);
  };

  const handleTakePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      onError("카메라 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onError("이미지를 생성할 수 없습니다.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      onError("이미지 변환에 실패했습니다.");
      return;
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      onError("최대 10MB 이하의 이미지만 업로드할 수 있습니다.");
      return;
    }
    const file = new File([blob], `capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    setIsCameraOpen(false);
    onCaptured(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      onError(
        `PNG/JPG 이미지만 업로드할 수 있습니다. (현재: ${file.type || "unknown"})`,
      );
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      onError("최대 10MB 이하의 이미지만 업로드할 수 있습니다.");
      return;
    }
    // 저해상도 사진은 OCR 인식이 어려워 미리 거른다. (크기 확인 실패 시엔 통과)
    try {
      const { width, height } = await readImageSize(file);
      if (width < MIN_OCR_DIMENSION || height < MIN_OCR_DIMENSION) {
        onError(
          "사진 해상도가 낮아 측정값 인식이 어려워요. 측정값이 또렷이 보이게 더 가까이서 다시 찍어주세요.",
        );
        return;
      }
    } catch {
      // 무시하고 진행
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
          <p className="mt-1 text-xs text-[#6B7280]">PNG/JPG · 최대 10MB</p>
        </div>
        <button
          type="button"
          onClick={handleCaptureClick}
          className="h-11 rounded-md bg-[#931B82] px-6 text-sm font-semibold text-white hover:bg-[#6A0F5D]"
        >
          사진 촬영
        </button>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#931B82] hover:underline"
        >
          <Icon icon="solar:question-circle-linear" width={14} height={14} />
          촬영 예시 보기
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className="flex gap-2">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            이전 단계
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
        >
          이 항목 건너뛰기
        </button>
        {onGoNext && (
          <button
            type="button"
            onClick={onGoNext}
            className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            다음 단계
          </button>
        )}
      </div>

      {onMeasureWithoutPhoto && (
        <button
          type="button"
          onClick={onMeasureWithoutPhoto}
          className="h-11 w-full rounded-md border border-[#931B82] bg-white text-sm font-medium text-[#931B82] hover:bg-[#F3E8FF]"
        >
          사진 없이 측정값 입력
        </button>
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {isStarting && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
                카메라 여는 중...
              </div>
            )}
            {/* OCR 정확도 가이드 — 바깥을 어둡게 깔고 가운데 박스만 또렷하게.
                LCD 가 사진의 30~50% 를 차지하는 적정 거리를 유도한다. */}
            {!isStarting && (
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute rounded-xl border-2 border-white/90"
                  style={{
                    left: "12%",
                    top: "26%",
                    width: "76%",
                    height: "40%",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  }}
                />
                <p
                  className="absolute w-full px-6 text-center text-sm font-medium text-white"
                  style={{ top: "70%" }}
                >
                  LCD(측정값)를 박스 안에 가득 차게 맞춰주세요
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 bg-black/90 px-6 py-5">
            <button
              type="button"
              onClick={handleCloseCamera}
              className="h-11 rounded-md bg-white/10 px-4 text-sm font-medium text-white"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={isStarting}
              className="h-16 w-16 rounded-full border-4 border-white bg-white disabled:opacity-50"
              aria-label="촬영"
            />
            <div className="w-15" />
          </div>
        </div>
      )}

      <CaptureGuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        onStart={handleGuideStart}
      />
    </div>
  );
}
