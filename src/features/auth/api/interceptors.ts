import { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { http } from "../../../lib/http";
import { reissue } from "./authApi";
import { tokenStorage } from "./tokenStorage";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// 동시에 여러 요청이 401 을 맞아도 재발급은 한 번만 수행한다. refresh 토큰이
// 1회용(rotation)인 백엔드에서, 병렬 재발급의 두 번째 요청이 이미 무효화된
// refresh 토큰으로 실패해 세션이 통째로 날아가는 것을 막는다.
//
// ※ 저장(save)까지 이 Promise 안에서 끝낸 뒤 리셋한다. 예전엔 finally 로 먼저
//   reissuePromise 를 null 로 지운 뒤 호출부에서 save 했는데, 그 사이 짧은 창에
//   또 다른 요청이 401 을 맞으면 아직 저장 안 된 "옛(무효화된) refresh 토큰"으로
//   재발급을 재시도해 세션이 통째로 clear 되는 레이스가 있었다. (브라우저 재시작
//   처럼 동시 요청이 많을 때 로그아웃되던 원인)
let reissuePromise: Promise<string> | null = null;

// 재발급 성공 시 새 토큰을 저장하고 새 accessToken 을 반환. 실패/세션변경 시 throw.
function reissueOnce(refreshToken: string): Promise<string> {
  if (!reissuePromise) {
    reissuePromise = reissue(refreshToken)
      .then((tokens) => {
        if (!tokens?.accessToken) {
          // 2xx 여도 토큰이 비어 오면 "undefined" 저장을 막기 위해 세션 폐기.
          tokenStorage.clear();
          throw new Error("reissue: empty accessToken");
        }
        const nextRefreshToken = tokens.refreshToken ?? refreshToken;
        // 재발급 도중 사용자가 로그아웃(clear)했거나 다른 세션으로 바뀌었으면
        // 죽은 세션을 되살리지 않는다.
        const current = tokenStorage.getRefresh();
        if (current !== refreshToken && current !== nextRefreshToken) {
          throw new Error("reissue: session changed");
        }
        tokenStorage.save({
          accessToken: tokens.accessToken,
          refreshToken: nextRefreshToken,
        });
        return tokens.accessToken;
      })
      .finally(() => {
        reissuePromise = null;
      });
  }
  return reissuePromise;
}

/**
 * axios 를 거치지 않는 요청(SSE 등)에서 401 을 맞았을 때 쓰는 재발급 진입점.
 *
 * 위 인터셉터와 같은 reissuePromise 를 공유하므로, SSE 재연결과 일반 API 요청이
 * 동시에 401 을 맞아도 재발급은 한 번만 일어난다(= 1회용 refresh 토큰 레이스 방지).
 *
 * 성공하면 새 accessToken 을 반환. refresh 토큰이 없거나 재발급이 실패하면 throw.
 */
export function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) {
    tokenStorage.clear();
    return Promise.reject(new Error("refreshAccessToken: no refresh token"));
  }
  return reissueOnce(refreshToken).catch((err: unknown) => {
    // 인터셉터와 동일 규칙 — refresh 토큰 자체가 무효일 때만 세션 폐기.
    if (
      err instanceof AxiosError &&
      (err.response?.status === 401 || err.response?.status === 403)
    ) {
      tokenStorage.clear();
    }
    throw err;
  });
}

export function installAuthInterceptors() {
  http.interceptors.request.use((config) => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      if (!original) return Promise.reject(error);

      const url = original.url ?? "";
      const isAuthFlow =
        url.includes("/auth/login") ||
        url.includes("/auth/signup") ||
        url.includes("/auth/reissue");

      if (
        error.response?.status === 401 &&
        !original._retry &&
        !isAuthFlow
      ) {
        original._retry = true;
        const refreshToken = tokenStorage.getRefresh();
        if (!refreshToken) {
          tokenStorage.clear();
          return Promise.reject(error);
        }
        try {
          // 재발급 + 새 토큰 저장을 한 번에 끝낸 뒤 새 accessToken 으로 재시도.
          // (저장까지 reissueOnce 안에서 원자적으로 처리되므로 옛 토큰 재사용 레이스 없음)
          const accessToken = await reissueOnce(refreshToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return http(original);
        } catch (refreshErr) {
          // refresh 토큰 자체가 무효(401/403)일 때만 세션을 폐기한다. 네트워크·
          // 서버 일시 오류로 재발급이 실패한 경우엔 토큰을 지우지 않아야 다음
          // 요청/새로고침에서 세션이 복구된다.
          if (
            refreshErr instanceof AxiosError &&
            (refreshErr.response?.status === 401 ||
              refreshErr.response?.status === 403)
          ) {
            tokenStorage.clear();
          }
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    },
  );
}
