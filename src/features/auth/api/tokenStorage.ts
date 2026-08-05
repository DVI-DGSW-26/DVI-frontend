import type { Role, TokenData, User } from "../type/types";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
// 사용자가 "로그인 유지" 체크했는지 — true 면 localStorage, false 면 sessionStorage.
// 위치는 localStorage 고정 (preference 자체는 브라우저 종료 후에도 기억해야 함).
const PERSIST_KEY = "auth-persist";
// 계정 전환용 — 이 기기에 저장된 계정 목록과, 그 중 지금 로그인된 계정의 loginId.
// 토큰과 같은 storage 에 둔다: "로그인 유지" 를 끄면 계정 목록도 탭과 함께 사라져야 한다.
const ACCOUNTS_KEY = "auth-accounts";
const ACTIVE_KEY = "auth-active";

/** 기기에 저장된 계정 하나. 전환 시 비밀번호 없이 이 토큰으로 바로 복귀한다. */
export interface StoredAccount {
  loginId: string;
  name: string;
  role: Role;
  accessToken: string;
  refreshToken: string;
}

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

function primaryStorage(): Storage {
  return getPersistPref() ? localStorage : sessionStorage;
}

// 읽기는 항상 두 storage 를 모두 본다 — persist 설정이 바뀌는 순간에도 값을 놓치지 않도록.
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string, storage: Storage): void {
  try {
    (storage === localStorage ? sessionStorage : localStorage).removeItem(key);
    storage.setItem(key, value);
  } catch {
    // 무시.
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // 무시.
  }
}

function readAccounts(): StoredAccount[] {
  const raw = readRaw(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 손상된 항목(구버전/수동 편집)은 조용히 버린다 — 전환 시 빈 토큰으로 실패하지 않도록.
    return parsed.filter(
      (a): a is StoredAccount =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as StoredAccount).loginId === "string" &&
        typeof (a as StoredAccount).accessToken === "string" &&
        typeof (a as StoredAccount).refreshToken === "string",
    );
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[], storage = primaryStorage()) {
  if (accounts.length === 0) {
    removeRaw(ACCOUNTS_KEY);
    return;
  }
  writeRaw(ACCOUNTS_KEY, JSON.stringify(accounts), storage);
}

export const tokenStorage = {
  // persist 미지정 시 이전 로그인 시 선택한 옵션을 그대로 사용 (reissue 같은 갱신 케이스).
  save({ accessToken, refreshToken }: TokenData, persist?: boolean) {
    const shouldPersist = persist ?? getPersistPref();
    // 저장 위치가 바뀔 수 있으므로 계정 목록을 먼저 읽어둔다.
    const accounts = readAccounts();
    const activeLoginId = readRaw(ACTIVE_KEY);

    setPersistPref(shouldPersist);
    const primary = shouldPersist ? localStorage : sessionStorage;
    const other = shouldPersist ? sessionStorage : localStorage;
    // 다른 storage 에 잔재 있으면 제거 — 두 군데 동시에 남으면 혼란.
    other.removeItem(ACCESS_KEY);
    other.removeItem(REFRESH_KEY);
    primary.setItem(ACCESS_KEY, accessToken);
    primary.setItem(REFRESH_KEY, refreshToken);

    // 재발급(reissue) 으로 토큰이 갱신되면 저장된 계정의 토큰도 같이 갱신해야
    // 나중에 그 계정으로 되돌아왔을 때 죽은 토큰을 쓰지 않는다.
    // 로그인 직후엔 아직 "누구인지" 모르므로 active 를 비워두고(clearActive) 호출한다 —
    // 그 경우 여기서 다른 계정의 토큰을 덮어쓰지 않는다.
    if (accounts.length > 0) {
      writeAccounts(
        activeLoginId
          ? accounts.map((a) =>
              a.loginId === activeLoginId
                ? { ...a, accessToken, refreshToken }
                : a,
            )
          : accounts,
        primary,
      );
    }
    if (activeLoginId) writeRaw(ACTIVE_KEY, activeLoginId, primary);
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
  /**
   * 현재 세션 폐기 — refresh 토큰까지 만료됐을 때 인터셉터가 호출한다.
   * 저장된 다른 계정까지 날리지는 않는다(죽은 건 이 계정 하나뿐이므로).
   */
  clear() {
    removeRaw(ACCESS_KEY);
    removeRaw(REFRESH_KEY);
    const activeLoginId = readRaw(ACTIVE_KEY);
    const rest = activeLoginId
      ? readAccounts().filter((a) => a.loginId !== activeLoginId)
      : readAccounts();
    writeAccounts(rest);
    removeRaw(ACTIVE_KEY);
    // 남은 계정이 없을 때만 "로그인 유지" 설정도 초기화한다. 계정이 남아 있는데
    // 지우면 다음 저장이 엉뚱한 storage 로 가서 목록과 토큰이 흩어진다.
    if (rest.length === 0) removeRaw(PERSIST_KEY);
  },
  /** 이 기기에서 완전히 로그아웃 — 저장된 계정 전부 삭제. */
  clearAll() {
    removeRaw(ACCESS_KEY);
    removeRaw(REFRESH_KEY);
    removeRaw(ACCOUNTS_KEY);
    removeRaw(ACTIVE_KEY);
    removeRaw(PERSIST_KEY);
  },
};

export const accountStorage = {
  list(): StoredAccount[] {
    return readAccounts();
  },
  activeLoginId(): string | null {
    return readRaw(ACTIVE_KEY);
  },
  /** 로그인 직후 — 아직 누구인지 모르는 구간. save() 가 남의 토큰을 덮어쓰지 않도록. */
  clearActive() {
    removeRaw(ACTIVE_KEY);
  },
  /** 현재 토큰을 이 사용자 계정으로 저장(있으면 갱신)하고 활성 계정으로 지정. */
  upsert(user: User) {
    const accessToken = tokenStorage.getAccess();
    const refreshToken = tokenStorage.getRefresh();
    if (!accessToken || !refreshToken) return;
    const entry: StoredAccount = {
      loginId: user.loginId,
      name: user.name,
      role: user.role,
      accessToken,
      refreshToken,
    };
    const rest = readAccounts().filter((a) => a.loginId !== user.loginId);
    writeAccounts([...rest, entry]);
    writeRaw(ACTIVE_KEY, user.loginId, primaryStorage());
  },
  remove(loginId: string) {
    writeAccounts(readAccounts().filter((a) => a.loginId !== loginId));
    if (readRaw(ACTIVE_KEY) === loginId) removeRaw(ACTIVE_KEY);
  },
  /**
   * 저장된 계정의 토큰을 현재 세션으로 올린다. 계정이 없으면 false.
   * 실제 사용자 정보는 호출부에서 getMe 로 확인한다(토큰이 만료됐을 수 있으므로).
   */
  activate(loginId: string): boolean {
    const target = readAccounts().find((a) => a.loginId === loginId);
    if (!target) return false;
    const primary = primaryStorage();
    writeRaw(ACCESS_KEY, target.accessToken, primary);
    writeRaw(REFRESH_KEY, target.refreshToken, primary);
    writeRaw(ACTIVE_KEY, target.loginId, primary);
    return true;
  },
};
