import { http, UPLOAD_TIMEOUT_MS } from "./http";

// 백엔드 업로드 제한과 동일. 초과하면 서버가 거절하므로 프론트에서 먼저 거른다.
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

interface UploadImageApiResponse {
  status: number;
  message: string;
  data: { url: string };
}

/**
 * 이미지 1장을 백엔드(POST /image)에 올리고 저장된 URL 을 돌려준다.
 * 측정 사진·제품 스케치가 같은 엔드포인트를 쓴다.
 */
export async function uploadImageFile(
  blob: Blob,
  fileName = "image.jpg",
): Promise<string> {
  const form = new FormData();
  const file =
    blob instanceof File
      ? blob
      : new File([blob], fileName, { type: blob.type || "image/jpeg" });
  form.append("file", file);
  // http instance 의 default Content-Type 이 application/json 이라서
  // axios 가 FormData 까지 JSON.stringify 해버린다. 헤더를 undefined 로 명시해서
  // instance default 를 무효화하고, transformRequest 도 그대로 통과시켜
  // FormData 가 XHR 까지 전달되도록 한다. 멀티파트 boundary 는 브라우저가 자동 설정.
  const { data } = await http.post<UploadImageApiResponse>("/image", form, {
    headers: { "Content-Type": undefined },
    transformRequest: [(d) => d],
    // 사진 전송은 기본 제한 시간(20초)으로는 부족할 수 있다.
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data.data.url;
}
