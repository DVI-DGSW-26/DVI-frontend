import { AxiosError } from "axios";
import { http } from "../../../lib/http";
import {
  AuthError,
  type ApiResponse,
  type LoginRequest,
  type SignupRequest,
  type TokenData,
} from "../type/types";

export async function signup(body: SignupRequest): Promise<void> {
  try {
    await http.post("/auth/signup", body);
  } catch (err) {
    if (err instanceof AxiosError) {
      const serverMessage =
        (err.response?.data as { message?: string } | undefined)?.message;
      if (err.response?.status === 400) {
        throw new AuthError(
          "UNKNOWN",
          serverMessage ?? "입력값을 확인해주세요.",
        );
      }
      if (err.response?.status === 409) {
        throw new AuthError(
          "UNKNOWN",
          serverMessage ?? "이미 존재하는 아이디입니다.",
        );
      }
      if (serverMessage) {
        throw new AuthError("UNKNOWN", serverMessage);
      }
    }
    throw new AuthError("UNKNOWN", "회원가입 중 오류가 발생했습니다.");
  }
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
