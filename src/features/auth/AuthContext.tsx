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
import {
  AuthError,
  accountStorage,
  getMe,
  login as loginApi,
  tokenStorage,
} from "./api";
import { stopWebPush } from "../notification/lib/webPush";
import type { PushSession } from "../notification/api/pushTokenApi";
import { clearViewState } from "../../lib/viewState";
import { currentApiServer, type ApiServer } from "../../lib/apiServer";
import type { LoginRequest, StoredAccount, TokenData, User } from "./api";

// 지금 올라가 있는 세션 — 푸시 해제를 보낼 곳. 세션을 바꾸거나 지우기 "전에"
// 잡아 둬야 한다. 바꾼 뒤에 읽으면 새 세션의 토큰·서버가 나온다.
function currentPushSession(): PushSession | undefined {
  const accessToken = tokenStorage.getAccess();
  return accessToken ? { accessToken, server: currentApiServer() } : undefined;
}

// 운영↔테스트 서버를 넘나들었으면 이전 서버의 푸시 등록을 푼다. 새 서버 등록은
// 사용자가 바뀌면 useNotificationAlerts 가 알아서 한다. 같은 서버 안에서의 전환은
// 서버가 토큰 소유자를 새 계정으로 옮겨 주므로 풀 필요가 없다.
function releasePushIfServerChanged(previous: PushSession | undefined) {
  if (previous && previous.server !== currentApiServer()) {
    void stopWebPush(previous);
  }
}

function assertTokens(tokens: TokenData | undefined): TokenData {
  if (!tokens?.accessToken) {
    throw new Error(
      "로그인 응답에 accessToken 이 없습니다. 백엔드 응답 형태를 확인해주세요.",
    );
  }
  return tokens;
}

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
      const previousPush = currentPushSession();

      // 로그인은 항상 운영 서버에서 시작한다. 받은 토큰은 아직 세션에 올리지
      // 않고, 그 토큰으로 누구인지만 확인한다.
      let tokens = assertTokens(await loginApi(body, "prod"));
      let server: ApiServer = "prod";
      let me = await getMe({ accessToken: tokens.accessToken, server });

      if (me.role === "TEST") {
        // 테스트 계정 — 백엔드에서 모든 권한을 가져서 운영에서 쓰면 안 된다.
        // 운영 토큰은 버리고 같은 자격증명으로 dev 서버에 다시 로그인한다.
        // (운영과 dev 는 JWT 비밀키가 달라 운영 토큰을 dev 에 쓸 수 없다)
        server = "test";
        try {
          tokens = assertTokens(await loginApi(body, server));
        } catch (err) {
          if (err instanceof AuthError) {
            throw new AuthError(err.code, `테스트 서버 로그인 실패: ${err.message}`);
          }
          throw err;
        }
        me = await getMe({ accessToken: tokens.accessToken, server });
      }

      // 아직 누구로 로그인했는지 모르는 구간 — 활성 포인터를 비워야 save() 가
      // "직전 계정"의 저장된 토큰을 새 토큰으로 덮어쓰지 않는다.
      accountStorage.clearActive();
      tokenStorage.save(tokens, persist, server);
      accountStorage.upsert(me);
      releasePushIfServerChanged(previousPush);
      // 이전 사용자로 받아둔 캐시가 새 계정 화면에 그대로 뜨는 것을 막는다.
      queryClient.clear();
      // 목록 화면에 기억해 둔 필터도 같이 버린다 — 앞 사용자가 걸어 둔 조건이다.
      clearViewState();
      setUser(me);
      setAccounts(accountStorage.list());
      return me;
    },
    [queryClient],
  );

  const switchAccount = useCallback(
    async (loginId: string) => {
      const previous = accountStorage.activeLoginId();
      const previousPush = currentPushSession();
      // 저장된 계정마다 발급 서버가 기록돼 있어, 올리는 순간 요청 기준 주소도
      // 그 서버로 바뀐다.
      if (!accountStorage.activate(loginId)) {
        throw new Error("저장된 계정이 아닙니다.");
      }
      try {
        const me = await getMe();
        accountStorage.upsert(me);
        releasePushIfServerChanged(previousPush);
        // 역할마다 보이는 데이터가 다르므로 이전 계정의 캐시는 통째로 버린다.
        queryClient.clear();
        clearViewState();
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
    // 이 기기로 더 이상 푸시가 가지 않도록 해제한다. 세션을 지운 뒤엔 토큰도
    // 서버(운영/테스트)도 알 수 없으므로, 지우기 전에 보낼 곳을 정해 넘긴다.
    void stopWebPush(currentPushSession());
    tokenStorage.clearAll();
    queryClient.clear();
    clearViewState();
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
