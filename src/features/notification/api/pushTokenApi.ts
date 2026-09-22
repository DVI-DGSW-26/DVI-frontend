import { http } from "../../../lib/http";
import { apiBase, type ApiServer } from "../../../lib/apiServer";

/** 푸시를 등록해 둔 세션 — 해제는 그 세션의 토큰으로, 그 서버에 보내야 한다. */
export interface PushSession {
  accessToken: string;
  server: ApiServer;
}

/**
 * 이 기기의 FCM 토큰을 서버에 등록한다. 로그인 직후와 토큰 갱신 시 호출.
 *
 * 한 사용자가 여러 기기를 쓸 수 있어 서버는 사용자 1 : 토큰 N 으로 저장한다.
 * 같은 토큰을 다시 보내도 안전하고(멱등), 이미 다른 계정이 등록해 둔 토큰이면
 * 소유자가 현재 로그인 사용자로 옮겨간다(공용 PC·공용 태블릿 대응).
 */
export async function registerPushToken(token: string): Promise<void> {
  await http.post("/notification/push-token", { token });
}

/**
 * 로그아웃 시 이 기기로 더 이상 푸시가 가지 않도록 해제한다.
 * 본인 소유 토큰만 지워지며, 없으면 아무 일도 일어나지 않는다(멱등).
 *
 * session 을 명시적으로 받는 이유 — 로그아웃·계정 전환은 저장된 세션을 지우거나
 * 바꾸면서 진행된다. 요청이 나갈 즈음엔 저장된 토큰·서버가 이미 다른 것(또는
 * 없음)이라, 해제할 세션의 토큰과 서버를 호출부가 미리 정해 넘겨야 한다.
 * 운영과 dev 는 따로 등록돼 있어서 서버를 틀리면 해제되지 않는다.
 *
 * DELETE 지만 본문으로 토큰을 보낸다(서버 명세). axios 는 `data` 로 넣어야 한다.
 */
export async function unregisterPushToken(
  token: string,
  session?: PushSession,
): Promise<void> {
  await http.delete("/notification/push-token", {
    data: { token },
    ...(session
      ? {
          baseURL: apiBase(session.server),
          headers: { Authorization: `Bearer ${session.accessToken}` },
          // 이 토큰은 저장된 세션의 것이 아니라 재발급할 수 없다.
          skipAuthRefresh: true,
        }
      : {}),
  });
}
