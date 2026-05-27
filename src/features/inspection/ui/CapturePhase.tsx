import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { isAllowedImageFile, MAX_UPLOAD_BYTES } from "../lib/cropImage";

interface Props {
  onCaptured: (file: File) => void;
  onError: (message: string) => void;
  onSkip: () => void;
}

export default function CapturePhase({ onCaptured, onError, onSkip }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      onError(`PNG/JPG 이미지만 업로드할 수 있습니다. (현재: ${file.type || "unknown"})`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
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
          onClick={handleOpenCamera}
          className="h-11 rounded-md bg-[#931B82] px-6 text-sm font-semibold text-white hover:bg-[#6A0F5D]"
        >
          사진 촬영
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
      <button
        type="button"
        onClick={onSkip}
        className="h-11 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
      >
        사진 촬영 불가
      </button>

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
    </div>
  );
}
