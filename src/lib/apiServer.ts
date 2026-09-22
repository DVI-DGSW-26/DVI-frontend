/**
 * 지금 세션이 어느 백엔드 서버를 쓰는지.
 *
 *   prod — 운영 서버. 프론트 경로 /api  → https://api.dvi-ind.com
 *   test — dev 서버.  프론트 경로 /api-test → https://api.dvi-ind.com/test
 *
 * 역할이 TEST 인 테스트 계정은 백엔드에서 모든 권한을 가진다. 그래서 운영
 * 데이터를 건드리지 않도록 그 계정의 세션은 전부 dev 서버로 보낸다.
 * (로그인 흐름은 AuthContext.login 참고)
 *
 * 값은 토큰과 같은 storage 에 둔다 — 토큰과 서버는 한 쌍이라 따로 놀면 안 된다.
 * 운영과 dev 는 JWT 비밀키가 달라 한쪽 토큰을 다른 쪽에 보내면 401 이다.
 * 쓰기는 tokenStorage 가 맡고, 여기서는 읽기만 한다. 값이 없으면 운영이다.
 */
export type ApiServer = "prod" | "test";

export const API_BASE: Record<ApiServer, string> = {
  prod: "/api",
  test: "/api-test",
};

/** 세션 서버 표시의 storage 키. 운영이면 키를 두지 않는다. */
export const API_SERVER_KEY = "auth-server";

export function currentApiServer(): ApiServer {
  try {
    const raw =
      localStorage.getItem(API_SERVER_KEY) ??
      sessionStorage.getItem(API_SERVER_KEY);
    return raw === "test" ? "test" : "prod";
  } catch {
    return "prod";
  }
}

/** 요청 기준 주소. 서버를 지정하지 않으면 지금 세션의 서버. */
export function apiBase(server: ApiServer = currentApiServer()): string {
  return API_BASE[server];
}

export function isTestSession(): boolean {
  return currentApiServer() === "test";
}
