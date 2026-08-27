import { http } from "../../../lib/http";

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
 * accessToken 을 명시적으로 받는 이유 — 로그아웃은 토큰을 지우면서 진행되는데,
 * 요청 인터셉터는 저장된 토큰이 없으면 Authorization 을 붙이지 못한다. 호출부가
 * 지우기 직전의 토큰을 넘겨주면 인터셉터가 덮어쓰지 않고 그대로 사용된다.
 *
 * DELETE 지만 본문으로 토큰을 보낸다(서버 명세). axios 는 `data` 로 넣어야 한다.
 */
export async function unregisterPushToken(
  token: string,
  accessToken?: string,
): Promise<void> {
  await http.delete("/notification/push-token", {
    data: { token },
    ...(accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {}),
  });
}
