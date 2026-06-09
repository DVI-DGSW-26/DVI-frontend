import type { TokenData } from "../type/types";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
// 사용자가 "로그인 유지" 체크했는지 — true 면 localStorage, false 면 sessionStorage.
// 위치는 localStorage 고정 (preference 자체는 브라우저 종료 후에도 기억해야 함).
const PERSIST_KEY = "auth-persist";

function getPersistPref(): boolean {
  // 기본값 true — "로그인 유지 켜둠" 이 기존 동작. 명시적으로 "false" 일 때만 sessionStorage.
  try {
    return localStorage.getItem(PERSIST_KEY) !== "false";
  } catch {
    return true;
  }
}

function setPersistPref(persist: boolean): void {
  try {
    localStorage.setItem(PERSIST_KEY, persist ? "true" : "false");
  } catch {
    // 무시.
  }
}

export const tokenStorage = {
  // persist 미지정 시 이전 로그인 시 선택한 옵션을 그대로 사용 (reissue 같은 갱신 케이스).
  save({ accessToken, refreshToken }: TokenData, persist?: boolean) {
    const shouldPersist = persist ?? getPersistPref();
    setPersistPref(shouldPersist);
    const primary = shouldPersist ? localStorage : sessionStorage;
    const other = shouldPersist ? sessionStorage : localStorage;
    // 다른 storage 에 잔재 있으면 제거 — 두 군데 동시에 남으면 혼란.
    other.removeItem(ACCESS_KEY);
    other.removeItem(REFRESH_KEY);
    primary.setItem(ACCESS_KEY, accessToken);
    primary.setItem(REFRESH_KEY, refreshToken);
  },
  getAccess() {
    return (
      localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY)
    );
  },
  getRefresh() {
    return (
      localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY)
    );
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    try {
      localStorage.removeItem(PERSIST_KEY);
    } catch {
      // 무시.
    }
  },
};
