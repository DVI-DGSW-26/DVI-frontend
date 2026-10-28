import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isAllowedImageFile,
  MAX_UPLOAD_BYTES,
  uploadImageFile,
} from "../../../../lib/uploadImage";
import { toBackendImageUrl } from "../../../../lib/imageUrl";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  alt: string;
  onUploadingChange?: (uploading: boolean) => void;
}

// 에칭 행의 사진 1장. 고르는 즉시 POST /image 로 올리고 받은 주소를 들고 있는다.
export default function PhotoInput({ value, onChange, alt, onUploadingChange }: Props) {
  const { t } = useTranslation("tryoutReport");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBusy = (b: boolean) => {
    setUploading(b);
    onUploadingChange?.(b);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!isAllowedImageFile(file)) return setError(t("photo.invalidFile"));
    if (file.size > MAX_UPLOAD_BYTES) return setError(t("photo.tooLarge"));
    setBusy(true);
    try {
      onChange(await uploadImageFile(file, file.name));
    } catch {
      setError(t("photo.failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // 표 칸이 좁아 한 줄에 작게 — 썸네일(누르면 크게 보기)과 바꾸기·지우기.
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        {value && (
          <a href={toBackendImageUrl(value)} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={toBackendImageUrl(value)}
              alt={alt}
              className="h-7 w-7 rounded border border-line object-cover"
            />
          </a>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-7 rounded border border-brand px-2 text-[0.6875rem] font-medium text-brand-fg hover:bg-brand-soft disabled:opacity-60"
        >
          {uploading ? t("photo.uploading") : value ? t("photo.change") : t("photo.upload")}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="h-7 px-1 text-[0.6875rem] text-fg-muted hover:text-danger-fg"
          >
            {t("photo.remove")}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-[0.6875rem] leading-tight text-danger-fg">{error}</p>}
    </div>
  );
}
