import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { http } from "../../../lib/http";
import { reissue } from "./authApi";
import { tokenStorage } from "./tokenStorage";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

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
          const tokens = await reissue(refreshToken);
          tokenStorage.save(tokens);
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return http(original);
        } catch (refreshErr) {
          tokenStorage.clear();
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    },
  );
}
