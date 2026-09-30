import axios from "axios";
import { apiBase } from "./apiServer";
import i18n from "./i18n";
import { installDataDictionary } from "./dataDictionary";

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

// 서버 오류 message 는 사용자 언어(PATCH /user/me/language)로 번역돼 온다. 그래도 서버에
// 언어가 아직 반영되지 않았거나 번역이 없는 문구는 한국어로 올 수 있다 — 영어 화면에서
// 한국어가 섞인 message 만 떼어 내, 화면마다 `message ?? t(...)` 의 자기 문구를 쓰게 한다.
// 문구 내용으로 분기하는 코드는 없다.
const HANGUL = /[가-힣]/;
http.interceptors.response.use(undefined, (err) => {
  const data = err?.response?.data;
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof (data as { message?: unknown }).message === "string" &&
    HANGUL.test((data as { message: string }).message) &&
    !i18n.language?.startsWith("ko")
  ) {
    delete (data as { message?: unknown }).message;
  }
  return Promise.reject(err);
});

// DB 값 번역 사전(테스트 서버) — lib/dataDictionary.ts 참고.
installDataDictionary(http);
