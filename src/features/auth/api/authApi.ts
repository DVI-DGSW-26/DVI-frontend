import { AxiosError } from "axios";
import { http } from "../../../lib/http";
import { apiBase, type ApiServer } from "../../../lib/apiServer";
import { isConnectionError } from "../../../lib/serverStatus";
import i18n from "../../../lib/i18n";
import {
  AuthError,
  type ApiResponse,
  type LoginRequest,
  type SignupRequest,
  type TokenData,
} from "../type/types";

// 에러 문구는 앱 언어를 따른다. 서버 message 는 한국어라, 영어 화면에서는 쓰지 않는다.
const msg = (key: string) => i18n.t(`errors.${key}`, { ns: "auth" });
const serverText = (text: string | undefined) =>
  i18n.language?.startsWith("ko") ? text : undefined;

export async function signup(body: SignupRequest): Promise<void> {
  try {
    await http.post("/auth/signup", body);
  } catch (err) {
    if (err instanceof AxiosError) {
      const serverMessage = serverText(
        (err.response?.data as { message?: string } | undefined)?.message,
      );
      if (err.response?.status === 400) {
        throw new AuthError(
          "UNKNOWN",
          serverMessage ?? msg("invalidInput"),
        );
      }
      if (err.response?.status === 409) {
        throw new AuthError(
          "UNKNOWN",
          serverMessage ?? msg("duplicateId"),
        );
      }
      if (serverMessage) {
        throw new AuthError("UNKNOWN", serverMessage);
      }
    }
    if (isConnectionError(err)) {
      throw new AuthError("UNKNOWN", msg("connection"));
    }
    throw new AuthError("UNKNOWN", msg("signupFailed"));
  }
}

/** server 를 주면 그 서버에 로그인한다. 없으면 지금 세션의 서버. */
export async function login(
  body: LoginRequest,
  server?: ApiServer,
): Promise<TokenData> {
  try {
    const { data } = await http.post<ApiResponse<TokenData>>(
      "/auth/login",
      body,
      server ? { baseURL: apiBase(server) } : undefined,
    );
    return data.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.response?.status === 401) {
        throw new AuthError(
          "INVALID_CREDENTIALS",
          msg("invalidCredentials"),
        );
      }
      if (err.response?.status === 403) {
        throw new AuthError(
          "USER_NOT_APPROVED",
          msg("notApproved"),
        );
      }
    }
    // 서버까지 닿지 못한 실패를 "로그인 중 오류" 로 뭉뚱그리면, 사용자가 계정
    // 문제로 오해하고 아이디·비밀번호를 계속 다시 친다. 원인을 밝혀준다.
    if (isConnectionError(err)) {
      throw new AuthError("UNKNOWN", msg("connection"));
    }
    throw new AuthError("UNKNOWN", msg("loginFailed"));
  }
}

export async function reissue(refreshToken: string): Promise<TokenData> {
  const { data } = await http.post<ApiResponse<TokenData>>("/auth/reissue", {
    refreshToken,
  });
  return data.data;
}
