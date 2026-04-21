import { AxiosError } from "axios";
import { http } from "../../../lib/http";
import {
  AuthError,
  type ApiResponse,
  type LoginRequest,
  type SignupRequest,
  type TokenData,
} from "./types";

export async function signup(body: SignupRequest): Promise<void> {
  await http.post("/auth/signup", body);
}

export async function login(body: LoginRequest): Promise<TokenData> {
  try {
    const { data } = await http.post<ApiResponse<TokenData>>(
      "/auth/login",
      body,
    );
    return data.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.response?.status === 401) {
        throw new AuthError(
          "INVALID_CREDENTIALS",
          "아이디 또는 비밀번호가 올바르지 않습니다.",
        );
      }
      if (err.response?.status === 403) {
        throw new AuthError(
          "USER_NOT_APPROVED",
          "아직 관리자 승인되지 않은 계정입니다.",
        );
      }
    }
    throw new AuthError("UNKNOWN", "로그인 중 오류가 발생했습니다.");
  }
}

export async function reissue(refreshToken: string): Promise<TokenData> {
  const { data } = await http.post<ApiResponse<TokenData>>("/auth/reissue", {
    refreshToken,
  });
  return data.data;
}
