import { AxiosError } from "axios";
import { http } from "../../../lib/http";
import { isConnectionError } from "../../../lib/serverStatus";
import {
  AuthError,
  type ApiResponse,
  type LoginRequest,
  type SignupRequest,
  type TokenData,
} from "../type/types";

const CONNECTION_ERROR_MESSAGE =
  "서버에 연결할 수 없습니다. 네트워크 상태를 확인하거나 관리자에게 서버 상태를 문의해 주세요.";

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
    if (isConnectionError(err)) {
      throw new AuthError("UNKNOWN", CONNECTION_ERROR_MESSAGE);
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
    // 서버까지 닿지 못한 실패를 "로그인 중 오류" 로 뭉뚱그리면, 사용자가 계정
    // 문제로 오해하고 아이디·비밀번호를 계속 다시 친다. 원인을 밝혀준다.
    if (isConnectionError(err)) {
      throw new AuthError("UNKNOWN", CONNECTION_ERROR_MESSAGE);
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
