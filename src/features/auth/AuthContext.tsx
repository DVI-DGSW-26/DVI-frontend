import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AxiosError } from "axios";
import { getMe, login as loginApi, tokenStorage } from "./api";
import type { LoginRequest, User } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  // persist=true (기본): localStorage 에 token 저장 (브라우저 종료 후에도 유지)
  // persist=false: sessionStorage 에 저장 (브라우저 종료 시 자동 로그아웃)
  login: (body: LoginRequest, persist?: boolean) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(
    () => tokenStorage.getAccess() !== null,
  );

  const refresh = useCallback(async () => {
    if (!tokenStorage.getAccess()) {
      setUser(null);
      return;
    }
    try {
      setUser(await getMe());
    } catch (err) {
      // 401(인증 실패)일 때만 세션을 폐기한다. 재발급까지 실패한 진짜 만료
      // 상황이다. 네트워크·서버 일시 오류(타임아웃/5xx/CORS)로 getMe 가 실패한
      // 경우까지 토큰을 지우면, 멀쩡한 세션이 영구 로그아웃돼 재접속해도 계속
      // 로그인 화면이 된다. 그 경우엔 토큰을 보존해 다음 새로고침에서 복구한다.
      if (err instanceof AxiosError && err.response?.status === 401) {
        tokenStorage.clear();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (body: LoginRequest, persist: boolean = true) => {
      const tokens = await loginApi(body);
      if (!tokens?.accessToken) {
        throw new Error(
          "로그인 응답에 accessToken 이 없습니다. 백엔드 응답 형태를 확인해주세요.",
        );
      }
      tokenStorage.save(tokens, persist);
      const me = await getMe();
      setUser(me);
      return me;
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
