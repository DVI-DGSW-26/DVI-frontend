import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe, login as loginApi, tokenStorage } from "./api";
import type { LoginRequest, Role, User } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (body: LoginRequest) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setDevRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// TODO: 서버 관리자 승인 흐름이 붙으면 아래 mock/bypass/devRole 관련 코드 모두 제거
const MOCK_USER: User = {
  id: 0,
  loginId: "mock",
  name: "임시 사용자",
  role: "QUALITY_ADMIN",
  status: "ACTIVE",
};

const BYPASS_AUTH = true;
const DEV_ROLE_KEY = "devRole";

const ALLOWED_ROLES: Role[] = [
  "ADMIN",
  "QUALITY_ADMIN",
  "PRODUCTION",
  "QUALITY",
];

function readDevRole(): Role | null {
  const stored = localStorage.getItem(DEV_ROLE_KEY);
  return stored && (ALLOWED_ROLES as string[]).includes(stored)
    ? (stored as Role)
    : null;
}

function buildMockUser(): User {
  const role = readDevRole() ?? MOCK_USER.role;
  return { ...MOCK_USER, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(
    BYPASS_AUTH ? buildMockUser() : null,
  );
  const [loading, setLoading] = useState<boolean>(
    () => !BYPASS_AUTH && tokenStorage.getAccess() !== null,
  );

  const refresh = useCallback(async () => {
    if (BYPASS_AUTH) {
      setUser(buildMockUser());
      return;
    }
    if (!tokenStorage.getAccess()) {
      setUser(null);
      return;
    }
    try {
      setUser(await getMe());
    } catch {
      setUser(buildMockUser());
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (body: LoginRequest) => {
    const tokens = await loginApi(body);
    tokenStorage.save(tokens);
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      const mock = buildMockUser();
      setUser(mock);
      return mock;
    }
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const setDevRole = useCallback((role: Role) => {
    localStorage.setItem(DEV_ROLE_KEY, role);
    setUser((prev) => ({ ...(prev ?? MOCK_USER), role }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refresh, setDevRole }}
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
