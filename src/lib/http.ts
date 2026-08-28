import axios from "axios";

// 응답 제한 시간. 예전엔 무제한이라 서버가 죽으면 요청이 영원히 떠 있었고,
// 화면이 "그냥 느린 것" 처럼 보여 사용자가 원인을 알 수 없었다. 여기서 끊어야
// serverStatus.ts 가 장애로 판정하고 팝업을 띄운다.
export const REQUEST_TIMEOUT_MS = 20000;
// 사진 업로드·OCR 은 현장 무선망에서 오래 걸릴 수 있어 따로 넉넉히 준다.
export const UPLOAD_TIMEOUT_MS = 60000;

export const http = axios.create({
  baseURL: "/api",
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});