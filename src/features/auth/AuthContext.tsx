import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe, login as loginApi, tokenStorage } from "./api";
import type { LoginRequest, User } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (body: LoginRequest) => Promise<User>;
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
    } catch {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (body: LoginRequest) => {
    const tokens = await loginApi(body);
    if (!tokens?.accessToken) {
      throw new Error(
        "로그인 응답에 accessToken 이 없습니다. 백엔드 응답 형태를 확인해주세요.",
      );
    }
    tokenStorage.save(tokens);
    const me = await getMe();
    setUser(me);
    return me;
  }, []);

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
