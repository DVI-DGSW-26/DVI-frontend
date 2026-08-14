import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { accountStorage, getMe, login as loginApi, tokenStorage } from "./api";
import type { LoginRequest, StoredAccount, User } from "./api";
import { stopNativePush } from "../notification/lib/nativePush";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  // 이 기기에 저장된 계정 목록 (계정 전환용). 현재 계정도 포함된다.
  accounts: StoredAccount[];
  // persist=true: localStorage 에 token 저장 (브라우저 종료 후에도 유지)
  // persist=false: sessionStorage 에 저장 (브라우저 종료 시 자동 로그아웃)
  // 미지정: 직전 로그인에서 고른 설정을 그대로 유지 (계정 전환용)
  login: (body: LoginRequest, persist?: boolean) => Promise<User>;
  // 이 기기에서 완전히 로그아웃 — 저장된 계정 전부 해제.
  logout: () => void;
  // 저장된 계정으로 비밀번호 없이 전환. 토큰이 만료됐으면 throw 하고 원래 계정으로 복귀.
  switchAccount: (loginId: string) => Promise<User>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>(() =>
    accountStorage.list(),
  );
  const [loading, setLoading] = useState<boolean>(
    () => tokenStorage.getAccess() !== null,
  );
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    if (!tokenStorage.getAccess()) {
      setUser(null);
      setAccounts(accountStorage.list());
      return;
    }
    try {
      const me = await getMe();
      // 저장된 계정의 이름/역할/토큰을 최신 상태로 유지한다.
      accountStorage.upsert(me);
      setUser(me);
    } catch (err) {
      // 401(인증 실패)일 때만 세션을 폐기한다. 재발급까지 실패한 진짜 만료
      // 상황이다. 네트워크·서버 일시 오류(타임아웃/5xx/CORS)로 getMe 가 실패한
      // 경우까지 토큰을 지우면, 멀쩡한 세션이 영구 로그아웃돼 재접속해도 계속
      // 로그인 화면이 된다. 그 경우엔 토큰을 보존해 다음 새로고침에서 복구한다.
      if (err instanceof AxiosError && err.response?.status === 401) {
        tokenStorage.clear();
        setUser(null);
      }
    } finally {
      setAccounts(accountStorage.list());
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (body: LoginRequest, persist?: boolean) => {
      const tokens = await loginApi(body);
      if (!tokens?.accessToken) {
        throw new Error(
          "로그인 응답에 accessToken 이 없습니다. 백엔드 응답 형태를 확인해주세요.",
        );
      }
      // 아직 누구로 로그인했는지 모르는 구간 — 활성 포인터를 비워야 save() 가
      // "직전 계정"의 저장된 토큰을 새 토큰으로 덮어쓰지 않는다.
      accountStorage.clearActive();
      tokenStorage.save(tokens, persist);
      const me = await getMe();
      accountStorage.upsert(me);
      // 이전 사용자로 받아둔 캐시가 새 계정 화면에 그대로 뜨는 것을 막는다.
      queryClient.clear();
      setUser(me);
      setAccounts(accountStorage.list());
      return me;
    },
    [queryClient],
  );

  const switchAccount = useCallback(
    async (loginId: string) => {
      const previous = accountStorage.activeLoginId();
      if (!accountStorage.activate(loginId)) {
        throw new Error("저장된 계정이 아닙니다.");
      }
      try {
        const me = await getMe();
        accountStorage.upsert(me);
        // 역할마다 보이는 데이터가 다르므로 이전 계정의 캐시는 통째로 버린다.
        queryClient.clear();
        setUser(me);
        setAccounts(accountStorage.list());
        return me;
      } catch (err) {
        // 전환 실패 — 토큰 만료(재발급까지 실패)거나 일시적 서버 오류.
        // 어느 쪽이든 직전 계정으로 되돌려 사용자를 로그인 화면에 버리지 않는다.
        if (previous) accountStorage.activate(previous);
        setAccounts(accountStorage.list());
        throw err;
      }
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    // 이 기기로 더 이상 푸시가 가지 않도록 해제한다. 토큰을 지우기 전에 시작해야
    // 인증된 요청으로 나가므로, 직전 accessToken 을 넘겨준다.
    void stopNativePush(tokenStorage.getAccess() ?? undefined);
    tokenStorage.clearAll();
    queryClient.clear();
    setUser(null);
    setAccounts([]);
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accounts,
        login,
        logout,
        switchAccount,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
