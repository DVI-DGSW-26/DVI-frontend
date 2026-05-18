export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg"];

export function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) return true;
  // 일부 Android 카메라 앱은 file.type 을 비워서 전달함 — 확장자로 폴백 검증
  if (file.type === "" || file.type === "application/octet-stream") {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return !!ext && ALLOWED_EXTENSIONS.includes(ext);
  }
  return false;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function getCroppedBlob(
  imageSrc: string,
  area: CropArea,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Blob 변환에 실패했습니다.")),
      "image/jpeg",
      0.92,
    );
  });
}
