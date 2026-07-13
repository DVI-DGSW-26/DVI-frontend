import { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { http } from "../../../lib/http";
import { reissue } from "./authApi";
import { tokenStorage } from "./tokenStorage";
import type { TokenData } from "../type/types";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// 동시에 여러 요청이 401 을 맞아도 재발급은 한 번만 수행한다. refresh 토큰이
// 1회용(rotation)인 백엔드에서, 병렬 재발급의 두 번째 요청이 이미 무효화된
// refresh 토큰으로 실패해 세션이 통째로 날아가는 것을 막는다.
let reissuePromise: Promise<TokenData> | null = null;

function reissueOnce(refreshToken: string): Promise<TokenData> {
  if (!reissuePromise) {
    reissuePromise = reissue(refreshToken).finally(() => {
      reissuePromise = null;
    });
  }
  return reissuePromise;
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
          const tokens = await reissueOnce(refreshToken);
          if (!tokens?.accessToken) {
            // 재발급이 2xx 여도 토큰이 비어 오면 깨진 토큰을 저장하지 않는다 —
            // "undefined" 가 저장되면 이후 모든 요청이 무한 로그아웃된다.
            tokenStorage.clear();
            return Promise.reject(error);
          }
          tokenStorage.save(tokens);
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
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
