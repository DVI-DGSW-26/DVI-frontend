import axios from "axios";
import { apiBase } from "./apiServer";

// 응답 제한 시간. 예전엔 무제한이라 서버가 죽으면 요청이 영원히 떠 있었고,
// 화면이 "그냥 느린 것" 처럼 보여 사용자가 원인을 알 수 없었다. 여기서 끊어야
// serverStatus.ts 가 장애로 판정하고 팝업을 띄운다.
export const REQUEST_TIMEOUT_MS = 20000;
// 사진 업로드·OCR 은 현장 무선망에서 오래 걸릴 수 있어 따로 넉넉히 준다.
export const UPLOAD_TIMEOUT_MS = 60000;

declare module "axios" {
  interface AxiosRequestConfig {
    /**
     * 401 을 맞아도 토큰 재발급·재시도를 하지 않는다. 저장된 세션이 아닌 토큰을
     * 직접 실어 보내는 요청용 — 재발급은 저장된 세션의 refresh 토큰으로 하므로
     * 엉뚱한 세션을 갱신하게 된다. (interceptors.ts 참고)
     */
    skipAuthRefresh?: boolean;
  }
}

// baseURL 을 고정하지 않는다. 테스트 계정 세션이면 /api-test 로 가야 해서,
// 아래 인터셉터가 요청마다 지금 세션의 서버를 넣는다. (lib/apiServer.ts)
export const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

// 이미 baseURL 이 있으면 건드리지 않는다 —
//  · 호출부가 서버를 직접 고른 요청(이전 서버의 푸시 해제 등)
//  · 401 재발급 뒤 재시도. 처음 나간 서버로 다시 보내야 한다.
http.interceptors.request.use((config) => {
  if (!config.baseURL) config.baseURL = apiBase();
  return config;
});
