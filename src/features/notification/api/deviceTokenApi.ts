import { http } from "../../../lib/http";

export type DevicePlatform = "android" | "ios" | "web";

/**
 * 이 기기의 FCM 토큰을 서버에 등록한다. 로그인 직후와 토큰 갱신 시 호출.
 * 한 사용자가 여러 기기를 쓸 수 있어 서버는 사용자 1 : 토큰 N 으로 저장하고,
 * 같은 토큰이 이미 있으면 소유자만 갱신(upsert)한다.
 */
export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  await http.post("/device-tokens", { token, platform });
}

/**
 * 로그아웃 시 이 기기로 더 이상 푸시가 가지 않도록 해제한다.
 *
 * accessToken 을 명시적으로 받는 이유 — 로그아웃은 토큰을 지우면서 진행되는데,
 * 요청 인터셉터는 저장된 토큰이 없으면 Authorization 을 붙이지 못한다. 호출부가
 * 지우기 직전의 토큰을 넘겨주면 인터셉터가 덮어쓰지 않고 그대로 사용된다.
 */
export async function deleteDeviceToken(
  token: string,
  accessToken?: string,
): Promise<void> {
  await http.delete(
    `/device-tokens/${encodeURIComponent(token)}`,
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );
}
