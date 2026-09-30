import { http } from "../../../lib/http";
import { apiBase, type ApiServer } from "../../../lib/apiServer";
import type { ApiResponse, User } from "../type/types";

/**
 * 내 정보. 인자 없이 부르면 저장된 세션으로 묻는다.
 *
 * session 을 주면 세션에 올리지 않은 토큰으로 그 서버에 묻는다 — 로그인 직후
 * "테스트 계정인가" 를 보려고 쓴다. 테스트 계정이면 운영 토큰을 저장하지 않고
 * 그대로 버릴 수 있다.
 */
export async function getMe(session?: {
  accessToken: string;
  server: ApiServer;
}): Promise<User> {
  const { data } = await http.get<ApiResponse<User>>(
    "/user/me",
    session
      ? {
          baseURL: apiBase(session.server),
          headers: { Authorization: `Bearer ${session.accessToken}` },
          skipAuthRefresh: true,
        }
      : undefined,
  );
  return data.data;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export async function changeMyPassword(
  body: ChangePasswordRequest,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    "/user/me/password",
    body,
  );
}
