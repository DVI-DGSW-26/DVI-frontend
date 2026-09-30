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

/**
 * 내 표시 언어를 서버에 저장한다 — 서버가 보내는 문구(에러·알림·엑셀 라벨)가 이 언어로 온다.
 * 서버에 기능이 없거나(배포 전) 실패해도 화면 언어는 그대로 두므로 오류를 삼킨다.
 */
export async function updateMyLanguage(language: "ko" | "en"): Promise<void> {
  try {
    await http.patch("/user/me/language", { language });
  } catch {
    // 무시 — 다음 로그인·언어 변경 때 다시 맞춘다.
  }
}
